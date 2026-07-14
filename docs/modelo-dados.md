# Modelo de Dados (rascunho)

Entidades principais do domínio. Serve de base para o schema Prisma na Fase 0.

## Usuario
- id, nome, email (único), senha_hash
- perfil: `admin` | `visualizador`

## Imovel
- id, endereco, descricao, fotos[]

## Inquilino
- id, imovel_id, nome, cpf_cnpj, telefone, email

## Contrato
- id, imovel_id, inquilino_id
- data_inicio, data_fim
- valor_aluguel, dia_vencimento
- indice_reajuste (`IGPM` | `IPCA` | ...), data_ultimo_reajuste
- valor_caucao
- anexo_url (contrato digitalizado)

## Receita
- id, imovel_id, inquilino_id
- data_recebimento, descricao, valor
- forma_pagamento (`pix` | `boleto` | `transferencia`)
- status (`pago` | `atrasado` | `pendente`)

## Despesa
- id, imovel_id
- data_pagamento, categoria (`agua` | `luz` | `iptu` | `condominio` | `manutencao` | `reforma` | `impostos`)
- descricao, fornecedor, valor
- forma_pagamento
- comprovante_url

## Relacionamentos
- Um `Imovel` tem muitos `Inquilino`, `Contrato`, `Receita`, `Despesa`.
- Um `Contrato` pertence a um `Inquilino` e a um `Imovel`.
- Acesso é escopado por `Imovel` (autorização multiusuário).
