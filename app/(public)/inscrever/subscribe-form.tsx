"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  Ticket,
  User,
} from "lucide-react";
import {
  submitSubscription,
  verifyEmail,
  type SubscriptionInput,
} from "./actions";
import { PhoneInput, type PhoneValue } from "./phone-input";

type EmailStatus = "idle" | "checking" | "valid" | "invalid";

const EMPTY_PHONE: PhoneValue = { e164: "", iso2: "BR", valid: false };

export function SubscribeForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [phone, setPhone] = useState<PhoneValue>(EMPTY_PHONE);
  const [attended, setAttended] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Guarda o último e-mail verificado pra não re-checar à toa.
  const lastChecked = useRef<string>("");

  async function runEmailCheck(value: string): Promise<boolean> {
    const v = value.trim().toLowerCase();
    if (!v) {
      setEmailStatus("idle");
      setEmailMsg(null);
      return false;
    }
    setEmailStatus("checking");
    setEmailMsg(null);
    const res = await verifyEmail(v);
    lastChecked.current = v;
    if (res.ok) {
      setEmailStatus("valid");
      setEmailMsg(null);
      return true;
    }
    setEmailStatus("invalid");
    setEmailMsg(res.reason);
    return false;
  }

  function handleEmailBlur() {
    if (!email.trim()) return;
    if (email.trim().toLowerCase() === lastChecked.current) return;
    void runEmailCheck(email);
  }

  const canSubmit =
    fullName.trim().length >= 2 &&
    emailStatus === "valid" &&
    phone.valid &&
    attended !== null &&
    !isPending;

  async function handleSubmit() {
    setError(null);

    if (fullName.trim().length < 2) {
      setError("Digite seu nome completo.");
      return;
    }
    // Garante verificação do e-mail antes de enviar.
    if (emailStatus !== "valid") {
      const ok = await runEmailCheck(email);
      if (!ok) {
        setError("Confira o e-mail antes de enviar.");
        return;
      }
    }
    if (!phone.valid) {
      setError("Digite um número de telefone válido.");
      return;
    }
    if (attended === null) {
      setError("Responda se você foi na primeira edição.");
      return;
    }

    const payload: SubscriptionInput = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.e164,
      phoneCountry: phone.iso2,
      attendedFirstEdition: attended,
    };

    startTransition(async () => {
      const res = await submitSubscription(payload);
      if (res.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        if (res.field === "email") setEmailStatus("invalid");
        setError(res.error);
      }
    });
  }

  if (done) {
    return <SuccessCard name={fullName.trim().split(" ")[0] ?? ""} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Nome completo */}
      <Field
        label="Nome completo"
        htmlFor="sub-name"
        icon={<User className="h-3.5 w-3.5" />}
      >
        <input
          id="sub-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Como você se chama?"
          className="w-full rounded-xl border border-line bg-ink-2/60 px-3.5 py-3.5 text-base text-paper placeholder:text-gray-mid transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
      </Field>

      {/* E-mail com verificação */}
      <Field
        label="E-mail"
        htmlFor="sub-email"
        icon={<Mail className="h-3.5 w-3.5" />}
        hint="Verificamos se o e-mail existe."
      >
        <div className="relative">
          <input
            id="sub-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailStatus !== "idle") {
                setEmailStatus("idle");
                setEmailMsg(null);
              }
            }}
            onBlur={handleEmailBlur}
            placeholder="seuemail@exemplo.com"
            aria-invalid={emailStatus === "invalid"}
            className={[
              "w-full rounded-xl border bg-ink-2/60 px-3.5 py-3.5 pr-11 text-base text-paper placeholder:text-gray-mid transition-colors focus:outline-none focus:ring-1 focus:ring-gold/40",
              emailStatus === "invalid"
                ? "border-red-poker/70 focus:border-red-poker"
                : emailStatus === "valid"
                  ? "border-felt focus:border-felt"
                  : "border-line focus:border-gold",
            ].join(" ")}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
            {emailStatus === "checking" && (
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
            )}
            {emailStatus === "valid" && (
              <Check className="h-4 w-4 text-felt" />
            )}
            {emailStatus === "invalid" && (
              <AlertCircle className="h-4 w-4 text-red-poker" />
            )}
          </span>
        </div>
        {emailStatus === "invalid" && emailMsg && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-poker">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {emailMsg}
          </p>
        )}
        {emailStatus === "valid" && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-felt">
            <Check className="h-3 w-3 shrink-0" />
            E-mail verificado.
          </p>
        )}
      </Field>

      {/* Telefone com seletor de país */}
      <Field label="Telefone / WhatsApp" htmlFor="sub-phone">
        <PhoneInput inputId="sub-phone" onChange={setPhone} />
      </Field>

      {/* Pergunta sim/não */}
      <div className="rounded-2xl border border-line bg-ink-2/60 p-5">
        <h3 className="font-display text-lg font-medium leading-snug text-paper">
          Você foi na{" "}
          <em className="not-italic italic text-gold">primeira edição</em> do
          PokerPi?
        </h3>
        <p className="mt-0.5 text-xs text-gray-mid">
          Curiosidade nossa — não muda sua inscrição.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SegButton
            active={attended === true}
            onClick={() => {
              setAttended(true);
              setError(null);
            }}
          >
            Sim, eu fui
          </SegButton>
          <SegButton
            active={attended === false}
            onClick={() => {
              setAttended(false);
              setError(null);
            }}
          >
            Não, é a primeira
          </SegButton>
        </div>
      </div>

      {error && (
        <p className="flex items-center justify-center gap-1.5 text-center text-sm text-red-poker">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Envio */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{ touchAction: "manipulation" }}
        className="mt-1 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gold px-6 font-mono text-xs uppercase tracking-[0.2em] text-ink shadow-[0_10px_30px_-8px_rgba(201,169,97,0.6)] transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Garantindo sua vaga…
          </>
        ) : (
          <>
            <Ticket className="h-4 w-4" />
            Garantir meu ingresso
          </>
        )}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-gray-mid">
        Ao se inscrever, você entra na lista de confirmação da nova edição.
        Entraremos em contato pelo e-mail e telefone informados.
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-soft"
      >
        {icon && <span className="text-gold">{icon}</span>}
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-mid">{hint}</p>}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ touchAction: "manipulation" }}
      className={[
        "flex h-12 items-center justify-center rounded-xl border text-sm font-medium transition-all active:scale-[0.98]",
        active
          ? "border-gold bg-gold/15 text-paper shadow-[inset_0_0_0_1px_rgba(201,169,97,0.5)]"
          : "border-line bg-ink-2 text-gray-soft hover:border-gold/50 hover:text-paper",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SuccessCard({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-gold/30 bg-ink-2 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
        <Ticket className="h-8 w-8" />
      </div>
      <h2 className="font-display text-3xl font-light tracking-tight text-paper">
        {name ? `Fechou, ${name}!` : "Inscrição confirmada!"}
      </h2>
      <p className="max-w-xs text-sm leading-relaxed text-gray-soft">
        Sua vaga na nova edição do{" "}
        <span className="text-gold">PokerPi</span> está na lista. A gente entra
        em contato com os próximos passos. Prepara o blefe. ♠
      </p>
    </div>
  );
}
