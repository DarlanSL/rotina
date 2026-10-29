import { describe, expect, it } from "vitest";
import { formatBytes, isAttachmentPathFor, mediaKind, safeFileName } from "@/lib/attachments";

describe("mediaKind", () => {
  it("aceita fotos e vídeos", () => {
    expect(mediaKind("image/jpeg")).toBe("image");
    expect(mediaKind("image/heic")).toBe("image");
    expect(mediaKind("video/mp4")).toBe("video");
    expect(mediaKind("video/quicktime")).toBe("video");
  });
  it("recusa SVG e outros tipos", () => {
    expect(mediaKind("image/svg+xml")).toBeNull();
    expect(mediaKind("text/html")).toBeNull();
    expect(mediaKind("")).toBeNull();
  });
});

describe("safeFileName", () => {
  it("tira acentos, espaços e barras", () => {
    expect(safeFileName("Foto da Reunião 01.JPG")).toBe("foto-da-reuniao-01.jpg");
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\fotos\\praia.png")).toBe("praia.png");
  });
  it("nunca fica vazio", () => {
    expect(safeFileName("😀.png")).toBe("arquivo.png");
    expect(safeFileName("")).toBe("arquivo");
  });
});

describe("isAttachmentPathFor", () => {
  it("só aceita arquivos direto na pasta do item", () => {
    expect(isAttachmentPathFor("abc", "anexos/abc/foto-x1y2.jpg")).toBe(true);
    expect(isAttachmentPathFor("abc", "anexos/outro/foto.jpg")).toBe(false);
    expect(isAttachmentPathFor("abc", "anexos/abc/")).toBe(false);
    expect(isAttachmentPathFor("abc", "anexos/abc/sub/foto.jpg")).toBe(false);
    expect(isAttachmentPathFor("abc", "anexos/abc/..")).toBe(false);
    expect(isAttachmentPathFor("ab", "anexos/abc/foto.jpg")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formata em KB e MB", () => {
    expect(formatBytes(500)).toBe("1 KB");
    expect(formatBytes(15 * 1024 * 1024)).toBe("15,0 MB");
  });
});
