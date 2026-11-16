// Lancé par tests-unitaires.mts avec une DATABASE_URL injoignable : le limiteur doit se rabattre sur la mémoire.
import { enregistrer, compte, remettreAZero } from "../lib/limiteur";
const a = await enregistrer("test", "x", 60000), b = await enregistrer("test", "x", 60000), c = await compte("test", "x", 60000);
await remettreAZero("test", "x");
const d = await compte("test", "x", 60000);
console.log(JSON.stringify([a, b, c, d]));
process.exit(0);
