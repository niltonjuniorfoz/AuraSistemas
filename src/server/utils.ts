export function toUpperText(value?: unknown): string | undefined {
  if (typeof value !== "string") return value as any;
  if (!value) return undefined;
  return value.trim().toUpperCase();
}

export function toLowerText(value?: unknown): string | undefined {
  if (typeof value !== "string") return value as any;
  if (!value) return undefined;
  return value.trim().toLowerCase();
}

/**
 * Common formatting for Postgres duplicate key errors inside standard error format.
 */
export function handleDbError(e: any, customMessages: Record<string, string> = {}): { error: string, fields?: Record<string, string> } {
  if (e?.code === '23505') { // unique_violation
    // e.detail usually looks like: Key (sku)=(iphone) already exists.
    const match = e.detail?.match(/Key \(([^)]+)\)=\(/);
    const field = match ? match[1] : 'field';
    
    let msg = `O valor informado para ${field} já está em uso.`;
    
    // Check if we have a custom message for this column
    if (customMessages[field]) {
      msg = customMessages[field];
    } else {
       if (field === 'sku') msg = "Já existe um produto cadastrado com este SKU. Se estiver arquivado, restaure ou exclua-o definitivamente.";
       if (field === 'upc') msg = "Já existe um produto cadastrado com este UPC.";
       if (field === 'document') msg = "Já existe um cliente com este documento.";
       if (field === 'username') msg = "Este nome de usuário já está em uso.";
       if (field === 'email') msg = "Este e-mail já está em uso.";
    }

    return { error: "Dados inválidos.", fields: { [field]: msg } };
  }
  
  return { error: e.message || "Erro interno do servidor." };
}
