"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import { saveBasics } from "@/server/actions/listings";
import type { ActionState } from "@/server/actions/_shared";
import { Field, Input, Select, Checkbox, ChoiceGroup } from "@/components/ui/form";
import { FormMessage } from "@/components/ui/feedback";
import { FormSection, StepFooter } from "./step-footer";
import { AVAILABILITY, FLOORS, LOCATION_PRECISIONS, PROPERTY_TYPES, PURPOSES } from "@/lib/listing/options";

export type BasicsValues = {
  purpose: string | null;
  propertyType: string | null;
  title: string | null;
  region: string | null;
  municipality: string | null;
  neighborhood: string | null;
  address: string | null;
  postalCode: string | null;
  locationPrecision: string;
  price: number | null;
  priceOnRequest: boolean;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  availability: string | null;
  availableFrom: string | null;
};

export function BasicsForm({ listingId, v }: { listingId: string; v: BasicsValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBasics.bind(null, listingId), null);
  const [type, setType] = useState(v.propertyType);
  const [purpose, setPurpose] = useState(v.purpose);
  const [onRequest, setOnRequest] = useState(v.priceOnRequest);
  const [availability, setAvailability] = useState(v.availability);
  const fe = state?.fieldErrors ?? {};
  const err = (k: string) => fe[k];

  return (
    <ActionForm action={action} pending={pending} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <FormSection title="Το ακίνητο">
        <div className="sm:col-span-2" onChange={(e) => setPurpose((e.target as HTMLInputElement).value)}>
          <ChoiceGroup legend="Σκοπός αγγελίας" name="purpose" options={PURPOSES.map((o) => ({ value: o.value, label: o.el }))} defaultValue={v.purpose} />
        </div>
        <div className="sm:col-span-2" onChange={(e) => setType((e.target as HTMLInputElement).value)}>
          <ChoiceGroup legend="Τύπος ακινήτου" name="propertyType" options={PROPERTY_TYPES.map((o) => ({ value: o.value, label: o.el }))} defaultValue={v.propertyType} />
        </div>
        <Field
          label="Τίτλος εργασίας"
          htmlFor="title"
          optional
          className="sm:col-span-2"
          error={err("title")}
          hint="Για δική σας αναφορά (π.χ. «Διαμέρισμα οδού …»). Ο δημόσιος τίτλος γράφεται στο βήμα «Κείμενα»."
        >
          <Input id="title" name="title" defaultValue={v.title ?? ""} maxLength={120} />
        </Field>
      </FormSection>

      <FormSection title="Τοποθεσία" description="Η διεύθυνση είναι ιδιωτική. Εσείς επιλέγετε πόσο λεπτομερής θα είναι η δημόσια τοποθεσία.">
        <Field label="Περιφέρεια / νομός" htmlFor="region" error={err("region")} hint="π.χ. Αττική, Θεσσαλονίκη, Κρήτη">
          <Input id="region" name="region" defaultValue={v.region ?? ""} autoComplete="address-level1" />
        </Field>
        <Field label="Δήμος" htmlFor="municipality" error={err("municipality")}>
          <Input id="municipality" name="municipality" defaultValue={v.municipality ?? ""} autoComplete="address-level2" />
        </Field>
        <Field label="Περιοχή / γειτονιά" htmlFor="neighborhood" optional error={err("neighborhood")}>
          <Input id="neighborhood" name="neighborhood" defaultValue={v.neighborhood ?? ""} />
        </Field>
        <Field label="Ταχυδρομικός κώδικας" htmlFor="postalCode" optional error={err("postalCode")}>
          <Input id="postalCode" name="postalCode" defaultValue={v.postalCode ?? ""} inputMode="numeric" autoComplete="postal-code" />
        </Field>
        <Field label="Διεύθυνση" htmlFor="address" optional className="sm:col-span-2" error={err("address")} hint="Ιδιωτική από προεπιλογή — δεν εμφανίζεται δημόσια ούτε αποστέλλεται για δημιουργία κειμένων.">
          <Input id="address" name="address" defaultValue={v.address ?? ""} autoComplete="street-address" />
        </Field>
        <Field label="Δημόσια εμφάνιση τοποθεσίας" htmlFor="locationPrecision" className="sm:col-span-2">
          <Select id="locationPrecision" name="locationPrecision" defaultValue={v.locationPrecision}>
            {LOCATION_PRECISIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.el}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title={purpose === "RENT" ? "Μίσθωμα και μεγέθη" : "Τιμή και μεγέθη"}>
        <Field label={purpose === "RENT" ? "Μηνιαίο μίσθωμα (€)" : "Ζητούμενη τιμή (€)"} htmlFor="price" error={err("price")}>
          <Input
            id="price"
            name="price"
            inputMode="numeric"
            defaultValue={v.price ?? ""}
            disabled={onRequest}
            placeholder="π.χ. 185.000"
            aria-invalid={Boolean(err("price"))}
          />
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox name="priceOnRequest" label="Τιμή κατόπιν επικοινωνίας" defaultChecked={v.priceOnRequest} onChange={(e) => setOnRequest(e.target.checked)} />
        </div>
        <Field label="Εσωτερικό εμβαδόν (m²)" htmlFor="areaSqm" error={err("areaSqm")} hint="Όπως αναγράφεται στα έγγραφα του ακινήτου.">
          <Input id="areaSqm" name="areaSqm" inputMode="decimal" defaultValue={v.areaSqm ?? ""} placeholder="π.χ. 86" aria-invalid={Boolean(err("areaSqm"))} />
        </Field>
        {type !== "DETACHED_HOUSE" ? (
          <Field label="Όροφος" htmlFor="floor" error={err("floor")}>
            <Select id="floor" name="floor" defaultValue={v.floor ?? ""}>
              <option value="">— Επιλέξτε —</option>
              {FLOORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.el}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div />
        )}
        <Field label="Υπνοδωμάτια" htmlFor="bedrooms" error={err("bedrooms")}>
          <Input id="bedrooms" name="bedrooms" type="number" min={0} max={50} defaultValue={v.bedrooms ?? ""} />
        </Field>
        <Field label="Μπάνια / WC" htmlFor="bathrooms" error={err("bathrooms")}>
          <Input id="bathrooms" name="bathrooms" type="number" min={0} max={50} defaultValue={v.bathrooms ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Διαθεσιμότητα">
        <Field label="Πότε είναι διαθέσιμο" htmlFor="availability" error={err("availability")}>
          <Select id="availability" name="availability" defaultValue={v.availability ?? ""} onChange={(e) => setAvailability(e.target.value)}>
            <option value="">— Επιλέξτε —</option>
            {AVAILABILITY.map((o) => (
              <option key={o.value} value={o.value}>
                {o.el}
              </option>
            ))}
          </Select>
        </Field>
        {availability === "FROM_DATE" && (
          <Field label="Διαθέσιμο από" htmlFor="availableFrom" error={err("availableFrom")}>
            <Input id="availableFrom" name="availableFrom" type="date" defaultValue={v.availableFrom ?? ""} />
          </Field>
        )}
      </FormSection>
      <StepFooter />
    </ActionForm>
  );
}
