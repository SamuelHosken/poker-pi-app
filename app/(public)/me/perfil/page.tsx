import Link from "next/link";
import { getMyProfileWithHistory } from "@/lib/tournament/profiles";
import { AvatarUploader } from "./avatar-uploader";
import { ProfileHistory } from "./profile-history";
import { ProfileStats } from "./profile-stats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LogoutMeButton } from "../logout-me-button";

export const metadata = {
  title: "Meu perfil · Poker Pi",
};

export default async function PerfilPage() {
  const data = await getMyProfileWithHistory();

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <Badge variant="destructive" className="uppercase tracking-wide">
          Sessão inválida
        </Badge>
        <h1 className="font-display text-2xl font-light tracking-tight text-paper">
          Não conseguimos identificar seu perfil.
        </h1>
        <p className="text-sm text-muted-foreground">
          Sua sessão está em estado inconsistente. Faça logout e login novamente.
        </p>
        <LogoutMeButton />
      </div>
    );
  }

  const { profile, email, history, stats } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Nav */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/me"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-paper"
        >
          ← Voltar
        </Link>
      </div>

      {/* Header / avatar */}
      <header className="space-y-2 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Meu perfil
        </span>
        <AvatarUploader name={profile.name} currentUrl={profile.avatar_url} />
        <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-paper break-words">
          {profile.name}
        </h1>
        {profile.nickname && (
          <p className="font-display text-base italic text-gold">
            {profile.nickname}
          </p>
        )}
      </header>

      {/* Dados pessoais */}
      <Card>
        <CardContent className="space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            Dados
          </span>
          <dl className="space-y-3">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Nome
              </dt>
              <dd className="text-paper">{profile.name}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Apelido
              </dt>
              <dd className="font-display italic text-gold">
                {profile.nickname ?? (
                  <span className="not-italic text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                E-mail
              </dt>
              <dd className="break-all text-paper">
                {email ?? <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Stats, fichas, rivalidades */}
      <ProfileStats stats={stats} />

      {/* Histórico */}
      <ProfileHistory history={history} />
    </div>
  );
}
