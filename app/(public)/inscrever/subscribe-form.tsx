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

// Verde legível sobre o dark quente (o token `felt` e escuro demais pra texto).
const OK_GREEN = "#4bbd83";

const EMPTY_PHONE: PhoneValue = { e164: "", iso2: "BR", valid: false };

export function SubscribeForm({ conviteSlug }: { conviteSlug?: string }) {
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
      conviteSlug,
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
          className="w-full rounded-xl border border-white/10 bg-ink-warm-2/60 px-3.5 py-3.5 text-base text-cream placeholder:text-cream-soft/70 transition-colors focus:border-red-bright focus:outline-none focus:ring-1 focus:ring-red-bright/30"
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
            style={emailStatus === "valid" ? { borderColor: OK_GREEN } : undefined}
            className={[
              "w-full rounded-xl border bg-ink-warm-2/60 px-3.5 py-3.5 pr-11 text-base text-cream placeholder:text-cream-soft/70 transition-colors focus:outline-none focus:ring-1 focus:ring-red-bright/30",
              emailStatus === "invalid"
                ? "border-red-bright/70 focus:border-red-bright"
                : emailStatus === "valid"
                  ? ""
                  : "border-white/10 focus:border-red-bright",
            ].join(" ")}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
            {emailStatus === "checking" && (
              <Loader2 className="h-4 w-4 animate-spin text-red-bright" />
            )}
            {emailStatus === "valid" && (
              <Check className="h-4 w-4" style={{ color: OK_GREEN }} />
            )}
            {emailStatus === "invalid" && (
              <AlertCircle className="h-4 w-4 text-red-bright" />
            )}
          </span>
        </div>
        {emailStatus === "invalid" && emailMsg && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-bright">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {emailMsg}
          </p>
        )}
        {emailStatus === "valid" && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: OK_GREEN }}>
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
      <div className="rounded-2xl border border-white/10 bg-ink-warm-2/60 p-5">
        <h3 className="font-condensed text-xl font-bold uppercase leading-snug tracking-tight text-cream">
          Você foi na{" "}
          <span className="text-red-bright">primeira edição</span> do Poker Pi?
        </h3>
        <p className="mt-1 text-xs text-cream-soft">
          Curiosidade nossa, não muda sua inscrição.
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
        <p className="flex items-center justify-center gap-1.5 text-center text-sm text-red-bright">
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
        className="mt-1 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-red-bright px-6 font-condensed text-base font-bold uppercase tracking-wide text-cream shadow-[0_12px_34px_-10px_rgba(212,5,5,0.65)] transition-all hover:bg-red-deep active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
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

      <p className="text-center text-[11px] leading-relaxed text-cream-soft">
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
        className="mb-2 flex items-center gap-1.5 font-condensed text-xs font-bold uppercase tracking-[0.14em] text-cream-soft"
      >
        {icon && <span className="text-red-bright">{icon}</span>}
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-cream-soft/80">{hint}</p>}
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
        "flex h-12 items-center justify-center rounded-xl border text-sm font-semibold transition-all active:scale-[0.98]",
        active
          ? "border-red-bright bg-red-bright/15 text-cream"
          : "border-white/10 bg-ink-warm-2 text-cream-soft hover:border-red-bright/50 hover:text-cream",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SuccessCard({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-red-bright/25 bg-ink-warm-2 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-bright/15 text-red-bright">
        <Ticket className="h-8 w-8" />
      </div>
      <h2 className="font-condensed text-3xl font-extrabold uppercase tracking-tight text-cream">
        {name ? `Fechou, ${name}!` : "Inscrição confirmada!"}
      </h2>
      <p className="max-w-xs text-sm leading-relaxed text-cream-soft">
        Sua vaga na nova edição do{" "}
        <span className="text-red-bright">Poker Pi</span> está na lista. A gente
        entra em contato com os próximos passos. Prepara o blefe. ♠
      </p>
    </div>
  );
}
