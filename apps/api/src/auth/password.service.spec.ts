import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("gera um hash diferente do texto original", async () => {
    const hash = await service.hash("SenhaForte123");
    expect(hash).not.toBe("SenhaForte123");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("valida a senha correta", async () => {
    const hash = await service.hash("SenhaForte123");
    await expect(service.verify(hash, "SenhaForte123")).resolves.toBe(true);
  });

  it("rejeita a senha incorreta", async () => {
    const hash = await service.hash("SenhaForte123");
    await expect(service.verify(hash, "senhaErrada")).resolves.toBe(false);
  });

  it("gera hashes distintos para a mesma senha (salt aleatório)", async () => {
    const hash1 = await service.hash("SenhaForte123");
    const hash2 = await service.hash("SenhaForte123");
    expect(hash1).not.toBe(hash2);
  });
});
