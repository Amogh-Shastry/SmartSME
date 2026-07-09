"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import { createProductAction, updateProductAction, adjustStockAction } from "./actions";

interface ProductLike {
  id: string;
  name: string;
  sku: string | null;
  hsn: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
}

export function ProductDialog({ product }: { product?: ProductLike }) {
  const editing = Boolean(product);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = editing
        ? await updateProductAction(product!.id, fd)
        : await createProductAction(fd);
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      {editing ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Edit product"
        >
          <Icon name="edit" size={16} />
        </button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> New product
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit product" : "New product"}
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Name">
            <Input name="name" defaultValue={product?.name} placeholder="Rice Bag 25kg" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <Input name="sku" defaultValue={product?.sku ?? ""} placeholder="RICE-25" />
            </Field>
            <Field label="HSN/SAC">
              <Input name="hsn" defaultValue={product?.hsn ?? ""} placeholder="1006" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit">
              <Input name="unit" defaultValue={product?.unit ?? "pcs"} placeholder="pcs" />
            </Field>
            <Field label="Purchase ₹">
              <Input name="purchasePrice" type="number" min={0} step="0.01" defaultValue={product?.purchasePrice ?? 0} />
            </Field>
            <Field label="Selling ₹">
              <Input name="sellingPrice" type="number" min={0} step="0.01" defaultValue={product?.sellingPrice ?? 0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!editing && (
              <Field label="Opening stock">
                <Input name="stock" type="number" min={0} step="1" defaultValue={0} />
              </Field>
            )}
            <Field label="Low-stock alert at">
              <Input name="lowStockThreshold" type="number" min={0} step="1" defaultValue={product?.lowStockThreshold ?? 10} />
            </Field>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Add product"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AdjustStockButton({ product }: { product: { id: string; name: string; unit: string } }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await adjustStockAction(product.id, fd);
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Adjust stock"
      >
        <Icon name="box" size={16} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adjust stock"
        description={product.name}
        className="max-w-md"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Change" hint={`Use a positive number to add ${product.unit}, negative to remove (damage, correction).`}>
            <Input name="delta" type="number" step="1" placeholder="e.g. 10 or -3" autoFocus required />
          </Field>
          <Field label="Note">
            <Input name="note" placeholder="Restock / damage / audit" />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Apply"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
