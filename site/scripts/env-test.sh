# Variables de la préproduction de test (identité fictive, clairement factice). À « sourcer ».
export PORT=3300 SITE_URL=http://localhost:3300 E2E=1
export STRIPE_SECRET_KEY=sk_test_simulation STRIPE_WEBHOOK_SECRET=whsec_simulation STRIPE_API_HOST=http://localhost:4242
export MOCK_WEBHOOK_URL=http://localhost:3300/api/stripe/webhook
export TACHES_SECRET=secret-de-test-des-taches-quotidiennes
export ADMIN_PASSWORD=demonstration SESSION_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef ADMIN_EMAIL=admin@example.com
export NEXT_PUBLIC_LEGAL_NAME="Titulaire De Test" NEXT_PUBLIC_LEGAL_SIRET=00000000000000
export NEXT_PUBLIC_LEGAL_ADDRESS="1 rue du Test, 00000 Testville" NEXT_PUBLIC_CONTACT_EMAIL=test@example.com
# Notifications et e-mails de test : tout passe par les faux services (scripts/faux-services.mjs), rien n'est envoyé pour de vrai.
export NTFY_URL=http://localhost:4343 NTFY_TOPIC=sa-test-notifications
export MAIL_FROM="Studio Accroche <contact@example.com>" SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_USER=contact@example.com SMTP_PASSWORD=mot-de-passe-de-test
