"use client";

import { useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ImagePlusIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAction } from "@/components/use-action";
import { attachMedia, deleteAttachment } from "@/app/(app)/ideias/actions";
import { prepareImage, uploadMedia } from "@/lib/upload-client";
import { ACCEPT_MEDIA, formatBytes, MAX_ATTACHMENTS_PER_ITEM, maxBytes, mediaKind } from "@/lib/attachments";
import { cn } from "@/lib/utils";
import type { ItemView } from "@/lib/queries/items";

export type AttachmentView = ItemView["attachments"][number];
type Upload = { key: string; name: string; percent: number };

const src = (id: string) => `/api/anexos/${id}`;

/** Envia arquivos para um item, um por vez, mostrando o progresso. */
export function useMediaUpload() {
  const [uploads, setUploads] = useState<Upload[]>([]);

  async function uploadFiles(itemId: string, files: File[], existing = 0) {
    const room = MAX_ATTACHMENTS_PER_ITEM - existing;
    if (files.length > room) toast.error(`Limite de ${MAX_ATTACHMENTS_PER_ITEM} anexos por item`);
    const queue = files.slice(0, Math.max(0, room)).map((file, i) => ({ file, key: `${Date.now()}-${i}` }));
    setUploads((u) => [...u, ...queue.map(({ file, key }) => ({ key, name: file.name, percent: 0 }))]);

    let sent = 0;
    for (const { file: original, key } of queue) {
      const done = () => setUploads((u) => u.filter((x) => x.key !== key));
      const kind = mediaKind(original.type);
      try {
        if (!kind) throw new Error(`"${original.name}" não é foto nem vídeo`);
        const file = kind === "image" ? await prepareImage(original) : original;
        if (file.size > maxBytes(kind)) {
          throw new Error(`"${original.name}" passa de ${formatBytes(maxBytes(kind))}`);
        }
        const setPercent = (percent: number) =>
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, percent } : x)));
        const uploaded = await uploadMedia(itemId, file, setPercent);
        const result = await attachMedia(itemId, uploaded);
        if (!result.ok) throw new Error(result.error);
        sent++;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha no envio");
      } finally {
        done();
      }
    }
    // attachMedia já revalida a página, então as miniaturas aparecem sozinhas
    if (sent > 0) toast.success(sent === 1 ? "Anexo adicionado" : `${sent} anexos adicionados`);
  }

  return { uploads, uploadFiles, uploading: uploads.length > 0 };
}

/** Seletor de arquivos escondido (no celular oferece câmera e galeria): renderize `input` e chame `open`. */
export function useMediaPicker(onFiles: (files: File[]) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT_MEDIA}
      multiple
      hidden
      data-testid="media-input"
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length) onFiles(files);
      }}
    />
  );
  return { input, open: () => inputRef.current?.click() };
}

function Thumb({ attachment }: { attachment: AttachmentView }) {
  if (mediaKind(attachment.contentType) === "video") {
    return (
      <>
        <video src={`${src(attachment.id)}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <PlayIcon className="size-5 fill-white text-white" />
        </span>
      </>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- arquivo privado servido pela nossa rota, sem otimizador
  return <img src={src(attachment.id)} alt={attachment.name} loading="lazy" className="size-full object-cover" />;
}

/** Miniaturas dos anexos; ao tocar, abre em tela cheia. */
export function AttachmentGallery({
  attachments,
  uploads = [],
  onAdd,
}: {
  attachments: AttachmentView[];
  uploads?: Upload[];
  onAdd?: () => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (attachments.length === 0 && uploads.length === 0) return null;
  const canAdd = onAdd && attachments.length + uploads.length < MAX_ATTACHMENTS_PER_ITEM;

  return (
    <>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Anexos">
        {attachments.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Abrir ${a.name}`}
              className="relative block size-16 overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-20"
            >
              <Thumb attachment={a} />
            </button>
          </li>
        ))}
        {uploads.map((u) => (
          <li
            key={u.key}
            aria-label={`Enviando ${u.name}`}
            className="flex size-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/50 text-xs text-muted-foreground sm:size-20"
          >
            <span className="font-medium tabular-nums">{Math.round(u.percent)}%</span>
            <span className="h-1 w-10 overflow-hidden rounded-full bg-border">
              <span className="block h-full bg-primary transition-all" style={{ width: `${u.percent}%` }} />
            </span>
          </li>
        ))}
        {canAdd && attachments.length > 0 && (
          <li>
            <button
              type="button"
              onClick={onAdd}
              aria-label="Adicionar foto ou vídeo"
              className="flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted sm:size-20"
            >
              <ImagePlusIcon className="size-5" />
            </button>
          </li>
        )}
      </ul>
      {open !== null && attachments[open] && (
        <MediaViewer attachments={attachments} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function MediaViewer({
  attachments,
  index,
  onIndexChange,
  onClose,
}: {
  attachments: AttachmentView[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { pending, run } = useAction();
  const current = attachments[index];
  const many = attachments.length > 1;
  const go = (step: number) => {
    setConfirming(false);
    onIndexChange((index + step + attachments.length) % attachments.length);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-3xl"
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {many && <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}/{attachments.length}</span>}
            {current.name}
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-black">
          {mediaKind(current.contentType) === "video" ? (
            <video key={current.id} src={src(current.id)} controls playsInline autoPlay className="max-h-[70vh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- arquivo privado servido pela nossa rota
            <img key={current.id} src={src(current.id)} alt={current.name} className="max-h-[70vh] w-auto object-contain" />
          )}
          {many && (
            <>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Anterior"
                className="absolute left-2 rounded-full opacity-90"
                onClick={() => go(-1)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Próximo"
                className="absolute right-2 rounded-full opacity-90"
                onClick={() => go(1)}
              >
                <ChevronRightIcon />
              </Button>
            </>
          )}
        </div>
        <DialogFooter className={cn(confirming && "items-center")}>
          {confirming ? (
            <>
              <span className="mr-auto text-sm">Excluir este anexo?</span>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  run(
                    () => deleteAttachment(current.id),
                    () => {
                      setConfirming(false);
                      if (attachments.length === 1) onClose();
                      else onIndexChange(Math.min(index, attachments.length - 2));
                    },
                  )
                }
              >
                Excluir
              </Button>
            </>
          ) : (
            <Button variant="outline" className="text-destructive" onClick={() => setConfirming(true)}>
              <Trash2Icon /> Excluir anexo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
