"use client";

import { createContext, useContext, useTransition, type ComponentProps, type FormEvent } from "react";

// React 19 resets <form action={fn}> after submission. That would discard what
// the user typed whenever validation fails, so our forms submit through a
// transition instead (no automatic reset) and share their pending state.

const PendingContext = createContext<boolean | null>(null);

export function useActionFormPending() {
  return useContext(PendingContext);
}

export function ActionForm({
  action,
  pending,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (fd: FormData) => void; pending: boolean }) {
  const [transitionPending, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => action(fd));
  };
  return (
    <PendingContext.Provider value={pending || transitionPending}>
      <form onSubmit={onSubmit} {...props}>
        {children}
      </form>
    </PendingContext.Provider>
  );
}
