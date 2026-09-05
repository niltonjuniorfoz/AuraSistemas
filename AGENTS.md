# Instruções do Projeto

- Use Graphify como fonte inicial para entender arquitetura, relações entre arquivos e impactos de mudanças.
- Consulte `graphify-out/graph.json` antes de alterações estruturais ou que envolvam múltiplos arquivos.
- Execute `graphify --update` após mudanças relevantes para atualizar somente os arquivos alterados.
- Confirme no código os achados do grafo antes de editar ou concluir uma análise.
- Preserve `AGENTS.md` e `graphify-out/` no repositório.

## Identidade operacional da plataforma

- `SYSTEM_BRAND.platformId`, `SYSTEM_BRAND.copyrightSuffix`, os contatos oficiais de suporte e o comportamento de `PlatformIdentity` fazem parte da infraestrutura funcional do Aura Sistemas, não do tema visual de uma loja.
- Em pedidos de rebranding, troca de nome, mudança de layout, clonagem de tema ou personalização para outro cliente, altere somente o nome visível solicitado (`displayName`, nome do sistema ou nome da loja). Não remova nem substitua a referência técnica da plataforma.
- O padrão de copyright é `© {displayName}. Todos os direitos reservados. S8R4S2C1O1O2B1Y5`. Somente `{displayName}` é variável. O sufixo `Todos os direitos reservados.` e `S8R4S2C1O1O2B1Y5` devem permanecer vinculados ao código da plataforma.
- A referência pode ser exibida em tipografia discreta, mas deve continuar presente nos metadados técnicos e nos pontos funcionais de suporte definidos pelo projeto.
