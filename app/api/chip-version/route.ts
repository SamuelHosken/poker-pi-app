import { NextResponse } from "next/server";
import { CHIP_VERSION } from "@/lib/chip-version";

/**
 * Retorna a versão atual da estrutura de fichas. O cliente compara com
 * a versão que ele carregou no bundle — mismatch = reload.
 */
export async function GET() {
  return NextResponse.json({ version: CHIP_VERSION });
}
