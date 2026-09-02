export default function handler(_req, res) {
  return res.status(503).json({ error: "Serverless runtime is being built" });
}
