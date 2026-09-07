# Supply Chain Hub

Crie um projeto web completo do zero com as specs abaixo:

**Stack**: Next.js + TypeScript + Tailwind + Supabase + NextAuth Google/Microsoft

**Tabelas e campos:**

1. fornecedores: id, razao_social, cnpj, cidade, estado, contato_principal, status, telefone, email, endereco, bairro, cidade_endereco, estado_uf, cep, fornecedor_ativo_sim_nao, criado_em

2. motoristas: id, fornecedor_id, nome_completo, cpf, celular, email, tipo_contato

tipo_contato: 'motorista1' ou 'motorista2'

3. cds: id, nome_cd, estacao, linha, capacidade, nivel_minimo, status, criado_em

4. atms: id, id_atm, modelo, estacao, localizacao_detalhada, capacidade_bobinas, nivel_minimo, status_operacional, atm_ativo_sim_nao, cd_id, criado_em

status_operacional: dropdown 'Operacional', 'Em Manutenção', 'Desativado'

atm_ativo_sim_nao: 'S' ou 'N'

5. linhas: id, cor_hex, nome, linha_ativa_sim_nao, criado_em

6. usuarios: id, nome_completo, email, perfil, data_cadastro, google_id, microsoft_id, criado_em

perfil: dropdown 'Usuário', 'Administrador', 'SUPER ADMIN'

obs: sem campo senha. Auth via Google/Microsoft

7. convites: id, email_convidado, perfil_convidado, token, status, convidado_por, criado_em

status: 'pendente', 'aceito', 'expirado'

8. configuracao_alertas: id, nome_configuracao, tipo_alerta, nivel_alerta_percentual, frequencia_envio_horas, destinatarios_email, mensagem_personalizada, configuracao_ativa, enviar_por_email, criado_em

9. itens, auditoria: estrutura básica

**Regras de UI - Bloco 0:**

1. Auth: Botões "Entrar com Google" e "Entrar com Microsoft". Sem senha.

2. CRUD Usuários: só SUPER ADMIN e ADMIN veem. Botão "Convidar Usuário" > abre modal email + perfil dropdown. Usuário aceita por email.

3. CRUD Usuários: caixa observação amarela Arial 10 vermelha **NOTA** 13: "Nota: O email do usuário não pode ser alterado após o cadastro."

4. Todo DROPDOWN e campo digitação: fundo cinza azulado clarinho #f1f5f9

5. CRUD Fornecedores: 3 abas. Todo CRUD: Cancelar/Criar. Toda tela: botão Voltar

6. Menu "Administração": Configuração de Alertas, Auditoria, Usuários, Sobre

**Importante**: Banco limpo, crie tudo do zero.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bobicontrol.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4e9970f5-60d3-4795-b7ec-e49ec67fe120).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
