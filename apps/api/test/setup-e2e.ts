import * as dotenv from "dotenv";
import * as path from "path";

// Carrega .env.test ANTES de qualquer módulo da aplicação ser importado
// pelos specs, garantindo que a API suba contra o banco de testes.
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

jest.setTimeout(30_000);
