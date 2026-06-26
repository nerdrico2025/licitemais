# Templates de e-mail — Supabase Auth

Templates em PT-BR personalizados para o **Licite Mais**.

Como o painel do Supabase não é editável via CLI neste projeto, estes arquivos
são a fonte versionada. Para aplicar, cole o conteúdo manualmente em:

**Supabase Dashboard → Authentication → Email Templates**

| Arquivo                | Template no painel | Assunto (campo "Subject")              |
| ---------------------- | ------------------ | -------------------------------------- |
| `confirm-signup.html`  | Confirm signup     | `Confirme seu e-mail — Licite Mais`    |
| `reset-password.html`  | Reset password     | `Redefinição de senha — Licite Mais`   |

## Notas

- O assunto vai no campo **Subject**, separado do corpo HTML.
- A variável `{{ .ConfirmationURL }}` é resolvida pelo Supabase em tempo de envio.
- Layout em `<table>` (não flex/grid) para máxima compatibilidade com Outlook/Gmail.
- Cor do botão: `#2563eb` (blue-600). Para trocar a cor da marca, substitua todas
  as ocorrências de `#2563eb`.
- Cada e-mail inclui o link em texto como fallback (boa prática anti-spam).
