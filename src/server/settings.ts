import { Router } from "express";
import { db } from "../db";
import { companySettings, currencies, fiscalSettings, emailSettings, printerSettings, systemSettings, brandLogos, products } from "../db/schema";
import nodemailer from "nodemailer";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { logAction } from "./audit";
import { eq, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import multer from "multer";
import { loadImageBuffer } from "./pdfHelpers";
import { getBackupSettings, runManualBackup, isDropboxConfigured, checkPendingAutomaticBackupNow } from "./backupService";
import { clearApiCache, withApiCache } from "./cache";

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 1 * 1024 * 1024 } }); // 1MB limit

const router = Router();
const PIX_SETTINGS_KEY = "company_pix";

let companySettingsCompatReady = false;
async function ensureCompanySettingsCompat() {
  if (companySettingsCompatReady) return;
  // Mantém compatibilidade com bancos já publicados antes do campo RUC/CNPJ.
  // Assim a tela de Dados da Empresa não quebra mesmo se o db:push ainda não tiver sido executado.
  await db.execute(sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'RUC'`);
  await db.execute(sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS instagram_url text`);
  companySettingsCompatReady = true;
}

// /api/settings/company-public é usado pela tela de login para carregar moeda/PIX
// antes de existir sessão. As demais rotas continuam protegidas normalmente.
router.use((req, res, next) => {
  if (req.method === "GET" && req.path === "/company-public") return next();
  return requireAuth(req as AuthRequest, res, next);
});

async function getPixSettings() {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, PIX_SETTINGS_KEY)).limit(1);
  return (rows[0]?.value as any) || {};
}

async function savePixSettings(value: any) {
  const parsedRate = Number(String(value?.pixExchangeRate || "").replace(",", "."));
  const payload = {
    pixKey: String(value?.pixKey || "").trim(),
    pixExchangeRate: Number.isFinite(parsedRate) && parsedRate > 0 ? String(parsedRate) : "5.50",
  };
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, PIX_SETTINGS_KEY)).limit(1);
  if (rows.length) {
    await db.update(systemSettings).set({ value: payload, updatedAt: new Date() }).where(eq(systemSettings.key, PIX_SETTINGS_KEY));
  } else {
    await db.insert(systemSettings).values({ key: PIX_SETTINGS_KEY, value: payload });
  }
  return payload;
}

router.get("/backup-status", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    await checkPendingAutomaticBackupNow("abertura da tela de backup", { force: true });
    const backup = await getBackupSettings();
    res.json({
      backup,
      dropboxConfigured: isDropboxConfigured(),
      googleDriveConfigured: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao carregar status do backup." });
  }
});

router.post("/backup-now", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const result = await runManualBackup(req.user!.userId);
    await logAction(req.user!.userId, "SETTINGS_BACKUP_MANUAL", "system_settings", "backup_settings", null, { filename: result.filename });

    res.setHeader("X-Backup-Filename", encodeURIComponent(result.filename));
    res.setHeader("X-Backup-Cloud-Message", encodeURIComponent(result.cloudMessage || ""));
    res.setHeader("X-Backup-Dropbox-Uploaded", result.dropboxUploaded ? "true" : "false");
    res.setHeader("Cache-Control", "no-store");
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        console.error("Erro ao enviar arquivo de backup:", err);
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao gerar backup manual." });
  }
});


router.get("/company", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    await ensureCompanySettingsCompat();
    let cs = await db.select().from(companySettings).limit(1);
    if (!cs.length) {
      await db.insert(companySettings).values({});
      cs = await db.select().from(companySettings).limit(1);
    }
    const pix = await getPixSettings();
    res.json({ ...cs[0], pixKey: pix.pixKey || "", pixExchangeRate: pix.pixExchangeRate || "5.50" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/company", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    await ensureCompanySettingsCompat();
    const data = req.body;
    const old = await db.select().from(companySettings).limit(1);
    const updatedBy = req.user!.userId;
    
    // Only update allowed fields
    const updateData = {
       companyName: data.companyName,
       tradeName: data.tradeName,
       documentType: data.documentType === "CNPJ" ? "CNPJ" : "RUC",
       documentNumber: data.documentNumber,
       phone: data.phone,
       email: data.email,
       address: data.address,
       city: data.city,
       country: data.country,
       logoUrl: data.logoUrl,
       whatsappGateway: data.whatsappGateway,
       instagramUrl: data.instagramUrl,
       defaultCurrency: data.defaultCurrency,
       defaultIvaPercentage: data.defaultIvaPercentage,
       updatedAt: new Date(),
       updatedBy
    };
    
    if (old.length && old[0]) {
       await db.update(companySettings).set(updateData).where(eq(companySettings.id, old[0].id));
    } else {
       await db.insert(companySettings).values(updateData);
    }
    
    const pix = await savePixSettings({ pixKey: data.pixKey, pixExchangeRate: data.pixExchangeRate });
    clearApiCache("settings:");
    await logAction(updatedBy, "UPDATE", "company_settings", old[0]?.id || 'new', undefined, { ...updateData, pixKey: pix.pixKey ? "***" : "" });
    
    res.json({ success: true, updatedConfig: { ...updateData, pixKey: pix.pixKey } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/company/logo", requirePermission("settings", "manage"), upload.single('logo'), async (req: AuthRequest, res) => {
  try {
    await ensureCompanySettingsCompat();
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato de arquivo inválido. Formatos suportados: JPG, JPEG, PNG, WEBP, SVG." });
    }

    // Salva a logo diretamente no banco como data URL.
    // Isso evita perder a imagem quando o servidor reinicia ou quando a Render recria o container.
    const mimeType = req.file.mimetype || "image/webp";
    const logoUrl = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
    
    const old = await db.select().from(companySettings).limit(1);
    const updatedBy = req.user!.userId;
    
    if (old.length && old[0]) {
       await db.update(companySettings).set({ logoUrl, updatedAt: new Date(), updatedBy }).where(eq(companySettings.id, old[0].id));
    } else {
       await db.insert(companySettings).values({ logoUrl, updatedAt: new Date(), updatedBy });
    }
    
    await logAction(updatedBy, "UPDATE", "company_settings", old[0]?.id || 'new', undefined, { logoUrl });
    clearApiCache("settings:");
    
    res.json({ success: true, logoUrl });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/company-public", async (req: AuthRequest, res) => {
  try {
    await ensureCompanySettingsCompat();
    const payload = await withApiCache("settings:company-public", 5 * 60 * 1000, async () => {
      const [cs, pix, brlRows] = await Promise.all([
        db.select().from(companySettings).limit(1),
        getPixSettings(),
        db.select().from(currencies).where(eq(currencies.code, "BRL")).limit(1),
      ]);
      const company: any = cs[0] || {};
      return {
        companyName: company.companyName || "",
        tradeName: company.tradeName || company.companyName || "",
        documentType: company.documentType || "RUC",
        documentNumber: company.documentNumber || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
        logoUrl: company.logoUrl || "",
        city: company.city || "Ciudad del Este",
        country: company.country || "Paraguay",
        pixKey: pix.pixKey || "",
        pixExchangeRate: pix.pixExchangeRate || "5.50",
        whatsappGateway: company.whatsappGateway || "",
        instagramUrl: company.instagramUrl || "",
        defaultCurrency: company.defaultCurrency || "USD",
        brlRateToUsd: brlRows[0]?.rateToUsd || pix.pixExchangeRate || "5.50",
      };
    });
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/pix", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const pix = await getPixSettings();
    res.json({ pixKey: pix.pixKey || "", pixExchangeRate: pix.pixExchangeRate || "5.50" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/pix", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const pix = await getPixSettings();
    const saved = await savePixSettings({
      pixKey: req.body.pixKey ?? pix.pixKey ?? "",
      pixExchangeRate: req.body.pixExchangeRate ?? pix.pixExchangeRate ?? "5.50",
    });
    clearApiCache("settings:");
    await logAction(req.user!.userId, "UPDATE", "system_settings", PIX_SETTINGS_KEY, undefined, { pixKey: saved.pixKey ? "***" : "", pixExchangeRate: saved.pixExchangeRate });
    res.json({ success: true, ...saved });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/currencies", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(currencies);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/currencies", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { code, rateToUsd } = req.body;
    if (!code || !rateToUsd) return res.status(400).json({ error: "Moeda e cotação são obrigatórias." });
    
    const updatedBy = req.user!.userId;
    const existing = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
    
    if (existing.length) {
       await db.update(currencies).set({ rateToUsd: String(rateToUsd), updatedAt: new Date(), updatedBy }).where(eq(currencies.code, code));
    } else {
       await db.insert(currencies).values({ code, rateToUsd: String(rateToUsd), updatedBy });
    }
    
    await logAction(updatedBy, "UPDATE", "currencies", code, existing[0], { rateToUsd });
    clearApiCache("settings:");
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/fiscal", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    let fs = await db.select().from(fiscalSettings).limit(1);
    if (!fs.length) {
      await db.insert(fiscalSettings).values({});
      fs = await db.select().from(fiscalSettings).limit(1);
    }
    res.json(fs[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/fiscal", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    const old = await db.select().from(fiscalSettings).limit(1);
    const updatedBy = req.user!.userId;
    
    const updateData = {
       ivaEnabled: data.ivaEnabled,
       defaultIvaPy: String(data.defaultIvaPy || 10),
       defaultIvaForeign: String(data.defaultIvaForeign || 0),
       updatedAt: new Date(),
       updatedBy
    };
    
    if (old.length && old[0]) {
       await db.update(fiscalSettings).set(updateData).where(eq(fiscalSettings.id, old[0].id));
    } else {
       await db.insert(fiscalSettings).values(updateData);
    }
    
    await logAction(updatedBy, "UPDATE", "fiscal_settings", old[0]?.id || 'new', undefined, updateData);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/email", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    let es = await db.select().from(emailSettings).limit(1);
    if (!es.length) {
      const [company] = await db.select().from(companySettings).limit(1);
      await db.insert(emailSettings).values({
         host: "smtp.example.com",
         port: 587,
         user: "user@example.com",
         password: "",
         fromEmail: "noreply@example.com",
         fromName: company?.tradeName || company?.companyName || "Sua loja"
      });
      es = await db.select().from(emailSettings).limit(1);
    }
    
    // hide password somewhat for frontend
    const payload = { ...es[0] };
    if (payload.password) {
       payload.password = "********";
    }
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/email", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    const old = await db.select().from(emailSettings).limit(1);
    const updatedBy = req.user!.userId;
    
    const updateData: any = {
      host: data.host,
      port: data.port,
      user: data.user,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      useTls: data.useTls,
      updatedAt: new Date(),
      updatedBy
    };
    
    if (data.password && data.password !== "********") {
      updateData.password = data.password;
    }
    
    if (old.length && old[0]) {
       await db.update(emailSettings).set(updateData).where(eq(emailSettings.id, old[0].id));
    } else {
       await db.insert(emailSettings).values(updateData);
    }
    
    await logAction(updatedBy, "UPDATE", "email_settings", old[0]?.id || 'new', undefined, { ...updateData, password: "***" });
    res.json({ success: true });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/email/test", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
     const dbSettings = await db.select().from(emailSettings).limit(1);
     if (!dbSettings.length) throw new Error("Configuração de e-mail não encontrada.");
     const conf = dbSettings[0];
     
     const transporter = nodemailer.createTransport({
       host: conf.host,
       port: conf.port,
       secure: conf.port === 465, // usually true for 465, false for other ports
       auth: {
         user: conf.user,
         pass: conf.password
       },
       tls: conf.useTls ? { rejectUnauthorized: false } : undefined
     });

     await transporter.verify();
     
     await transporter.sendMail({
        from: `"${conf.fromName}" <${conf.fromEmail}>`,
        to: conf.fromEmail,
        subject: `Teste de Configuração SMTP - ${conf.fromName || "Sua loja"}`,
        text: "Suas configurações de e-mail estão funcionando perfeitamente."
     });

     res.json({ success: true, message: "E-mail de teste enviado com sucesso!" });
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
});

router.get("/printers", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    let ps = await db.select().from(printerSettings).limit(1);
    if (!ps.length) {
       await db.insert(printerSettings).values({});
       ps = await db.select().from(printerSettings).limit(1);
    }
    res.json(ps[0]);
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/printers", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
     const data = req.body;
     const old = await db.select().from(printerSettings).limit(1);
     const updatedBy = req.user!.userId;
     
     const updateData = {
        receiptFormat: data.receiptFormat,
        adminFormat: data.adminFormat,
        printMode: data.printMode,
        updatedBy
     };
     
     if (old.length) {
        await db.update(printerSettings).set(updateData).where(eq(printerSettings.id, old[0].id));
     } else {
        await db.insert(printerSettings).values(updateData);
     }
     await logAction(updatedBy, "UPDATE", "printer_settings", old[0]?.id || 'new', old[0], updateData);
     res.json({ success: true });
  } catch(error: any) {
     res.status(500).json({ error: error.message });
  }
});

router.get("/printers/test", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { format } = req.query; // e.g. 80mm, 58mm, A4
    const isThermal = format === '80mm' || format === '58mm';
    const width = format === '58mm' ? 164.4 : (format === '80mm' ? 226.77 : undefined);
    
    const doc = new PDFDocument({
       margin: isThermal ? 10 : 30,
       size: isThermal ? [width!, 600] : (format as any || 'A4')
    });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="teste_impressao.pdf"`);
    doc.pipe(res);
    
    const comp = await db.select().from(companySettings).limit(1);
    const company = comp[0];
    
    const logoBuffer = await loadImageBuffer(company?.logoUrl || undefined);
    if (logoBuffer) {
        try {
            if (isThermal) {
               const startY = doc.y;
               doc.image(logoBuffer, (width! - 110) / 2, startY, { fit: [110, 100], align: 'center' });
               doc.y = startY + 115;
            } else {
               doc.image(logoBuffer, 30, doc.y, { fit: [165, 130] });
               doc.moveDown(5);
            }
        } catch(e) {}
    }
    
    const storeName = company?.tradeName || company?.companyName || "Sua loja";
    doc.fontSize(14).font("Helvetica-Bold").text(`TESTE DE IMPRESSÃO - ${storeName}`, { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica").text(`Formato: ${isThermal ? 'Termica' : 'Administrativa'} ${format}`, { align: "center" });
    doc.text(`Data/hora: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);
    
    doc.text("Se voce consegue ler este texto, a impressora esta configurada e operando corretamente.");
    doc.text("--------------------------------------------------");
    doc.moveDown(1);
    doc.text(`${storeName} · operado pelo Aura Sistemas`);
    
    doc.end();
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SHORTCUTS ---
router.get("/shortcuts", async (req: AuthRequest, res) => {
  try {
    const payload = await withApiCache("settings:shortcuts", 5 * 60 * 1000, async () => {
      const sc = await db.select().from(systemSettings).where(eq(systemSettings.key, "pos_shortcuts")).limit(1);
      if (!sc.length) return { shortcuts: {} };
      return { shortcuts: sc[0].value || {} };
    });
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao buscar atalhos" });
  }
});

router.put("/shortcuts", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { shortcuts } = req.body;
    const sc = await db.select().from(systemSettings).where(eq(systemSettings.key, "pos_shortcuts")).limit(1);
    
    if (sc.length) {
      await db.update(systemSettings).set({ value: shortcuts, updatedAt: new Date() }).where(eq(systemSettings.key, "pos_shortcuts"));
    } else {
      await db.insert(systemSettings).values({ key: "pos_shortcuts", value: shortcuts });
    }
    await logAction(req.user!.userId, "UPDATE_SHORTCUTS", "system_settings", "pos_shortcuts", null, shortcuts);
    clearApiCache("settings:");
    res.json({ message: "Success" });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao salvar atalhos" });
  }
});

router.post("/shortcuts/reset", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    await db.delete(systemSettings).where(eq(systemSettings.key, "pos_shortcuts"));
    await logAction(req.user!.userId, "RESET_SHORTCUTS", "system_settings", "pos_shortcuts", null, null);
    clearApiCache("settings:");
    res.json({ message: "Success" });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao resetar atalhos" });
  }
});

// --- BRAND LOGOS ---
// Lista toda marca já cadastrada em brand_logos + toda marca distinta que
// já existe em produtos e ainda não tem linha aqui (aparece com logoUrl
// null, visible false, sortOrder no fim — o admin sabe o que falta subir).
router.get("/brands", requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(brandLogos).orderBy(brandLogos.sortOrder);
    const existingNames = new Set(existing.map((b) => b.name));
    const distinctBrands = await db.selectDistinct({ brand: products.brand }).from(products)
      .where(sql`${products.brand} is not null and ${products.brand} <> ''`)
      .orderBy(products.brand);
    const maxOrder = existing.reduce((m, b) => Math.max(m, b.sortOrder), -1);
    const discovered = distinctBrands
      .map((r) => r.brand)
      .filter((name): name is string => !!name && !existingNames.has(name))
      .map((name, i) => ({
        id: null, name, logoUrl: null, sortOrder: maxOrder + 1 + i, visible: false,
      }));
    res.json({ data: [...existing, ...discovered] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Upsert por nome: se a marca já existe em brand_logos, atualiza o logo; se
// só existia "descoberta" via products.brand, cria a linha agora.
router.post("/brands/:name/logo", requirePermission("settings", "manage"), upload.single("logo"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato de arquivo inválido. Formatos suportados: JPG, JPEG, PNG, WEBP, SVG." });
    }
    const name = String(req.params.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da marca inválido." });
    const logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const [existing] = await db.select().from(brandLogos).where(eq(brandLogos.name, name)).limit(1);
    if (existing) {
      await db.update(brandLogos).set({ logoUrl, updatedAt: new Date() }).where(eq(brandLogos.id, existing.id));
    } else {
      await db.insert(brandLogos).values({ name, logoUrl, visible: true });
    }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Ordem/visibilidade: upsert por nome igual a rota de logo acima.
router.put("/brands/:name", requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const name = String(req.params.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da marca inválido." });
    const { sortOrder, visible, logoUrl } = req.body || {};
    const updates: any = { updatedAt: new Date() };
    if (sortOrder !== undefined) updates.sortOrder = Math.max(0, parseInt(String(sortOrder), 10) || 0);
    if (visible !== undefined) updates.visible = !!visible;
    if (logoUrl !== undefined) {
      const url = String(logoUrl || "").trim();
      if (url && !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ error: "Link do logo precisa começar com http:// ou https://." });
      }
      updates.logoUrl = url || null;
    }
    const [existing] = await db.select().from(brandLogos).where(eq(brandLogos.name, name)).limit(1);
    if (existing) {
      await db.update(brandLogos).set(updates).where(eq(brandLogos.id, existing.id));
    } else {
      await db.insert(brandLogos).values({ name, ...updates });
    }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
