import { prisma } from '../prisma.js';
import { AppError } from '../auth/auth.service.js';

// Garante que o usuário tem acesso ao imóvel (vínculo UsuarioImovel).
// Lança 403 caso contrário. Usado por todas as rotas escopadas por imóvel.
export async function garantirAcessoImovel(usuarioId: string, imovelId: string): Promise<void> {
  const vinculo = await prisma.usuarioImovel.findUnique({
    where: { usuarioId_imovelId: { usuarioId, imovelId } },
  });
  if (!vinculo) throw new AppError(403, 'Sem acesso a este imóvel');
}
