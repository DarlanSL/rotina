"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, FileSpreadsheetIcon, MailIcon, PrinterIcon, Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { AnchorButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";

// Clientes de e-mail costumam cortar links mailto muito longos
const MAILTO_BODY_LIMIT = 1800;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.42 9.43-9.42 2.52 0 4.88.98 6.66 2.76a9.36 9.36 0 0 1 2.76 6.67c0 5.2-4.23 9.42-9.43 9.42m8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.7 5.84.7 12.1c0 2 .52 3.95 1.52 5.67L.6 23.25l5.6-1.47a11.3 11.3 0 0 0 5.84 1.6h.01c6.25 0 11.34-5.1 11.35-11.35 0-3.03-1.18-5.88-3.33-8.02" />
    </svg>
  );
}

export function ShareBar({
  title,
  text,
  csv,
  fileBase,
}: {
  title: string;
  text: string;
  csv: string;
  fileBase: string;
}) {
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [copied, setCopied] = useState(false);

  // Web Share com arquivo só existe em alguns navegadores (Android/iOS) — detecta após montar
  useEffect(() => {
    try {
      const probe = new File([""], "x.csv", { type: "text/csv" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção de recurso do navegador
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  const csvFile = () => new File([csv], `${fileBase}.csv`, { type: "text/csv;charset=utf-8" });

  function downloadCsv() {
    const url = URL.createObjectURL(csvFile());
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Texto copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text, files: [csvFile()] });
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error("Não foi possível compartilhar");
    }
  }

  const mailBody =
    text.length > MAILTO_BODY_LIMIT
      ? `${text.slice(0, MAILTO_BODY_LIMIT)}…\n\n(Relatório resumido. Para o completo, anexe o PDF ou o Excel gerado no app.)`
      : text;
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(mailBody)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="outline" onClick={() => window.print()}>
        <PrinterIcon /> PDF / Imprimir
      </Button>
      <Button variant="outline" onClick={downloadCsv}>
        <FileSpreadsheetIcon /> Excel (CSV)
      </Button>
      <AnchorButton
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#25D366] text-white hover:bg-[#1ebe5b]"
      >
        <WhatsAppIcon /> WhatsApp
      </AnchorButton>
      <AnchorButton variant="outline" href={mailto}>
        <MailIcon /> E-mail
      </AnchorButton>
      <Button variant="ghost" onClick={copyText}>
        {copied ? <CheckIcon /> : <CopyIcon />} Copiar texto
      </Button>
      {canShareFiles && (
        <Button variant="secondary" onClick={share}>
          <Share2Icon /> Compartilhar arquivo
        </Button>
      )}
    </div>
  );
}
