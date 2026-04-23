import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

loadEnvFile(path.join(repoRoot, "backend", ".env"));
loadEnvFile(path.join(repoRoot, "backend", ".env.local"));
loadEnvFile(path.join(repoRoot, ".env"));

const email = process.argv[2] || process.env.ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!email) {
  console.error(
    "Uso: node backend/scripts/set-admin-role.mjs admin@correo.com 12345678"
  );
  process.exit(1);
}

if (!password) {
  console.error(
    "Falta la contraseña. Uso: node backend/scripts/set-admin-role.mjs admin@correo.com 12345678"
  );
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno o en backend/.env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const pageSize = 1000;
let page = 1;
let targetUser = null;

while (!targetUser) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: pageSize });

  if (error) {
    throw error;
  }

  const users = data?.users || [];
  targetUser = users.find((user) => `${user.email || ""}`.toLowerCase() === email.toLowerCase());

  if (targetUser || users.length < pageSize) {
    break;
  }

  page += 1;
}

if (!targetUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: "admin",
    },
  });

  if (error) {
    throw error;
  }

  console.log(`Usuario admin creado para ${email}.`);
  console.log(
    JSON.stringify(
      {
        id: data.user.id,
        email: data.user.email,
        app_metadata: data.user.app_metadata,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const { data, error } = await supabase.auth.admin.updateUserById(targetUser.id, {
  password,
  email_confirm: true,
  app_metadata: {
    ...(targetUser.app_metadata || {}),
    role: "admin",
  },
});

if (error) {
  throw error;
}

console.log(`Rol admin aplicado a ${email}.`);
console.log(JSON.stringify({ id: data.user.id, email: data.user.email, app_metadata: data.user.app_metadata }, null, 2));
