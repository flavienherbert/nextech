# Variables de la préproduction de test (identité fictive, clairement factice). À « sourcer ».
export PORT=3300 SITE_URL=http://localhost:3300 E2E=1
export STRIPE_SECRET_KEY=sk_test_simulation STRIPE_WEBHOOK_SECRET=whsec_simulation STRIPE_API_HOST=http://localhost:4242
export MOCK_WEBHOOK_URL=http://localhost:3300/api/stripe/webhook
export ADMIN_PASSWORD=demonstration SESSION_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef ADMIN_EMAIL=admin@example.com
export NEXT_PUBLIC_LEGAL_NAME="Titulaire De Test" NEXT_PUBLIC_LEGAL_SIRET=00000000000000
export NEXT_PUBLIC_LEGAL_ADDRESS="1 rue du Test, 00000 Testville" NEXT_PUBLIC_CONTACT_EMAIL=test@example.com
