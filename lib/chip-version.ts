/**
 * Versão da estrutura de fichas exibida em /me/mesa/[id]/dinheiro.
 *
 * BUMP esse valor SEMPRE que mudar denominações ou cores das fichas. O
 * cliente do `chip-calculator.tsx` polla `/api/chip-version` a cada 15s e
 * dá `window.location.reload()` se receber uma versão diferente da que tá
 * no bundle dele — todo mundo com a página aberta atualiza sozinho.
 */
export const CHIP_VERSION = "v2-100-500-1000-5000-25000";
