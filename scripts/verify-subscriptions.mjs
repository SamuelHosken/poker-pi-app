// Verificação end-to-end da tabela subscriptions contra o banco real.
// Roda com: node --env-file=.env.local scripts/verify-subscriptions.mjs
import { createClient } from "@supabase/supabase-js";
import { resolveMx } from "node:dns/promises";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const testEmail = `__verify_${Date.now()}@gmail.com`;
let pass = 0;
let fail = 0;
const ok = (m) => (pass++, console.log("  ✅", m));
const no = (m) => (fail++, console.log("  ❌", m));

console.log("\n[1] MX check (verificação de e-mail leve)");
try {
  const gmail = await resolveMx("gmail.com");
  gmail.length > 0 ? ok("gmail.com tem MX") : no("gmail.com sem MX?!");
  try {
    const bogus = await resolveMx("dominio-que-nao-existe-zzz999.com");
    bogus.length > 0 ? no("domínio falso resolveu MX?!") : ok("domínio falso sem MX");
  } catch {
    ok("domínio falso lança erro (tratado como inválido)");
  }
} catch (e) {
  no("erro no MX: " + e.message);
}

console.log("\n[2] INSERT anônimo (RLS subscriptions_insert_public)");
const { error: insErr } = await anon.from("subscriptions").insert({
  full_name: "Teste Verificação",
  email: testEmail,
  phone: "+5561999998888",
  phone_country: "BR",
  attended_first_edition: true,
});
insErr ? no("insert anon falhou: " + insErr.message) : ok("insert anônimo aceito pela RLS");

console.log("\n[3] SELECT anônimo deve ser BLOQUEADO (lista privada)");
const { data: anonRead } = await anon
  .from("subscriptions")
  .select("*")
  .eq("email", testEmail);
(!anonRead || anonRead.length === 0)
  ? ok("anon não consegue ler (RLS sem policy de SELECT)")
  : no("anon LEU dados privados?! vazou");

console.log("\n[4] SELECT admin (service role) deve LER");
const { data: adminRead, error: admErr } = await admin
  .from("subscriptions")
  .select("*")
  .eq("email", testEmail)
  .maybeSingle();
admErr || !adminRead
  ? no("admin não leu: " + (admErr?.message ?? "vazio"))
  : ok(`admin leu o registro (nome=${adminRead.full_name}, país=${adminRead.phone_country})`);

console.log("\n[5] Dedup por e-mail (unique index lower(email))");
const { error: dupErr } = await anon.from("subscriptions").insert({
  full_name: "Duplicado",
  email: testEmail.toUpperCase(),
  phone: "+5561888887777",
  attended_first_edition: false,
});
dupErr?.code === "23505"
  ? ok("e-mail duplicado rejeitado (23505)")
  : no("dedup falhou: " + (dupErr ? dupErr.message : "inseriu duplicado!"));

console.log("\n[6] CHECK constraints da RLS (telefone curto deve falhar)");
const { error: badErr } = await anon.from("subscriptions").insert({
  full_name: "X",
  email: `__bad_${Date.now()}@gmail.com`,
  phone: "+5",
  attended_first_edition: true,
});
badErr
  ? ok("telefone inválido barrado pela RLS/constraint")
  : no("telefone inválido passou?!");

console.log("\n[cleanup] removendo registros de teste");
await admin.from("subscriptions").delete().like("email", "__verify_%");
await admin.from("subscriptions").delete().like("email", "__bad_%");
console.log("  🧹 limpo");

console.log(`\n=== RESULTADO: ${pass} ok / ${fail} falhas ===`);
process.exit(fail > 0 ? 1 : 0);
