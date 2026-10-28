"use client";

import { useActionState, useState } from "react";
import { saveDetails } from "@/server/actions/listings";
import type { ActionState } from "@/server/actions/_shared";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, FormMessage } from "@/components/ui/feedback";
import { FormSection, StepFooter } from "./step-footer";
import type { ListingDetails } from "@/lib/listing/schema";
import {
  ACCESSIBILITY,
  AIR_CONDITIONING,
  ENERGY_CLASSES,
  EXTRA_FEATURES,
  FURNISHED,
  HEATING,
  OCCUPANCY,
  ORIENTATIONS,
  OUTDOOR_SPACES,
  PARKING,
  TRI_STATE,
  type Option,
} from "@/lib/listing/options";

const toChoices = (list: readonly Option[]) => list.map((o) => ({ value: o.value, label: o.el }));

function OptionSelect({ name, list, value, label, hint }: { name: string; list: readonly Option[]; value?: string; label: string; hint?: string }) {
  return (
    <Field label={label} htmlFor={name} optional hint={hint}>
      <Select id={name} name={name} defaultValue={value ?? ""}>
        <option value="">— Δεν έχει συμπληρωθεί —</option>
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.el}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function DetailsForm({
  listingId,
  d,
  propertyType,
  purpose,
}: {
  listingId: string;
  d: ListingDetails;
  propertyType: string | null;
  purpose: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveDetails.bind(null, listingId), null);
  const [renovated, setRenovated] = useState(d.renovated);
  const [outdoor, setOutdoor] = useState(d.outdoor);
  const [parking, setParking] = useState(d.parking);
  const [yearUnknown, setYearUnknown] = useState(d.yearBuilt === "UNKNOWN");
  const [chargesUnknown, setChargesUnknown] = useState(d.commonCharges === "UNKNOWN");
  const fe = state?.fieldErrors ?? {};
  const inBuilding = propertyType !== "DETACHED_HOUSE";
  const multiLevel = propertyType === "MAISONETTE" || propertyType === "DETACHED_HOUSE";
  const features = EXTRA_FEATURES.filter((f) => purpose === "RENT" || (f.value !== "PETS_ALLOWED" && f.value !== "STUDENT_FRIENDLY"));

  return (
    <ActionForm action={action} pending={pending} className="space-y-5" noValidate>
      {!propertyType && (
        <Alert tone="info">Επιλέξτε πρώτα τύπο ακινήτου στο βήμα 1 — οι ερωτήσεις εδώ προσαρμόζονται σε αυτόν.</Alert>
      )}
      <FormMessage state={state} />
      <Alert tone="neutral">
        Όλα τα πεδία είναι προαιρετικά. Αν δεν γνωρίζετε κάτι, επιλέξτε «Δεν είναι γνωστό» — δεν θα «χρεωθείτε» στην πληρότητα και
        τίποτα δεν θα συμπληρωθεί αυτόματα. Δεν εξάγουμε ποτέ στοιχεία όπως εμβαδόν, ενεργειακή κατηγορία ή νομική κατάσταση από
        φωτογραφίες.
      </Alert>

      <FormSection title="Κατασκευή και ανακαίνιση">
        <Field label="Έτος κατασκευής" htmlFor="yearBuilt" optional error={fe.yearBuilt}>
          <Input
            id="yearBuilt"
            name="yearBuilt"
            inputMode="numeric"
            defaultValue={typeof d.yearBuilt === "number" ? d.yearBuilt : ""}
            disabled={yearUnknown}
            placeholder="π.χ. 1978"
          />
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox name="yearBuiltUnknown" label="Δεν είναι γνωστό" defaultChecked={yearUnknown} onChange={(e) => setYearUnknown(e.target.checked)} />
        </div>
        <div className="sm:col-span-2" onChange={(e) => setRenovated((e.target as HTMLInputElement).value as typeof renovated)}>
          <ChoiceGroup legend="Έχει ανακαινιστεί;" name="renovated" optional options={toChoices(TRI_STATE)} defaultValue={d.renovated} />
        </div>
        {renovated === "YES" && (
          <>
            <Field label="Έτος ανακαίνισης" htmlFor="renovationYear" optional error={fe.renovationYear}>
              <Input id="renovationYear" name="renovationYear" inputMode="numeric" defaultValue={d.renovationYear ?? ""} />
            </Field>
            <Field
              label="Τι ανακαινίστηκε"
              htmlFor="renovationDescription"
              optional
              className="sm:col-span-2"
              hint="Περιγράψτε μόνο εργασίες που έγιναν πράγματι (π.χ. «νέα κουζίνα και κουφώματα αλουμινίου, 2021»)."
            >
              <Textarea id="renovationDescription" name="renovationDescription" defaultValue={d.renovationDescription ?? ""} rows={3} maxLength={1000} />
            </Field>
          </>
        )}
      </FormSection>

      <FormSection title="Θέρμανση, ψύξη και ενέργεια">
        <OptionSelect name="heating" list={HEATING} value={d.heating} label="Θέρμανση" />
        <OptionSelect name="airConditioning" list={AIR_CONDITIONING} value={d.airConditioning} label="Κλιματισμός" />
        <OptionSelect
          name="energyClass"
          list={ENERGY_CLASSES}
          value={d.energyClass}
          label="Ενεργειακή κατηγορία (ΠΕΑ)"
          hint="Όπως αναγράφεται στο Πιστοποιητικό Ενεργειακής Απόδοσης."
        />
      </FormSection>

      <FormSection title="Κτίριο και χώροι">
        {inBuilding && (
          <div className="sm:col-span-2">
            <ChoiceGroup legend="Ανελκυστήρας" name="elevator" optional options={toChoices(TRI_STATE)} defaultValue={d.elevator} />
          </div>
        )}
        <div className="sm:col-span-2">
          <ChoiceGroup legend="Αποθήκη" name="storage" optional options={toChoices(TRI_STATE)} defaultValue={d.storage} />
        </div>
        <Field label="Στάθμευση" htmlFor="parking" optional>
          <Select id="parking" name="parking" defaultValue={d.parking ?? ""} onChange={(e) => setParking(e.target.value as typeof parking)}>
            <option value="">— Δεν έχει συμπληρωθεί —</option>
            {PARKING.map((o) => (
              <option key={o.value} value={o.value}>
                {o.el}
              </option>
            ))}
          </Select>
        </Field>
        {parking && parking !== "NONE" && parking !== "UNKNOWN" ? (
          <Field label="Αριθμός θέσεων" htmlFor="parkingSpaces" optional error={fe.parkingSpaces}>
            <Input id="parkingSpaces" name="parkingSpaces" type="number" min={1} max={20} defaultValue={d.parkingSpaces ?? ""} />
          </Field>
        ) : (
          <div />
        )}
        {multiLevel && (
          <Field label="Αριθμός επιπέδων" htmlFor="levels" optional error={fe.levels}>
            <Input id="levels" name="levels" type="number" min={1} max={10} defaultValue={d.levels ?? ""} />
          </Field>
        )}
        {propertyType === "DETACHED_HOUSE" && (
          <Field label="Εμβαδόν οικοπέδου (m²)" htmlFor="plotAreaSqm" optional error={fe.plotAreaSqm}>
            <Input id="plotAreaSqm" name="plotAreaSqm" inputMode="decimal" defaultValue={d.plotAreaSqm ?? ""} />
          </Field>
        )}
        {inBuilding && (
          <>
            <Field label="Μηνιαία κοινόχρηστα (€)" htmlFor="commonCharges" optional error={fe.commonCharges}>
              <Input
                id="commonCharges"
                name="commonCharges"
                inputMode="decimal"
                defaultValue={typeof d.commonCharges === "number" ? d.commonCharges : ""}
                disabled={chargesUnknown}
              />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox name="commonChargesUnknown" label="Δεν είναι γνωστά" defaultChecked={chargesUnknown} onChange={(e) => setChargesUnknown(e.target.checked)} />
            </div>
          </>
        )}
      </FormSection>

      <FormSection title="Εξωτερικοί χώροι, προσανατολισμός και θέα">
        <div className="sm:col-span-2" onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === "outdoor") setOutdoor(t.value as typeof outdoor);
        }}>
          <ChoiceGroup legend="Μπαλκόνι, βεράντα ή κήπος" name="outdoor" optional options={toChoices(TRI_STATE)} defaultValue={d.outdoor} />
        </div>
        {outdoor === "YES" && (
          <>
            <div className="sm:col-span-2">
              <ChoiceGroup legend="Τύπος" name="outdoorSpaces" type="checkbox" options={toChoices(OUTDOOR_SPACES)} defaultValue={d.outdoorSpaces} />
            </div>
            <Field label="Συνολικό εμβαδόν εξωτερικών χώρων (m²)" htmlFor="outdoorAreaSqm" optional error={fe.outdoorAreaSqm}>
              <Input id="outdoorAreaSqm" name="outdoorAreaSqm" inputMode="decimal" defaultValue={d.outdoorAreaSqm ?? ""} />
            </Field>
          </>
        )}
        <div className="sm:col-span-2">
          <ChoiceGroup legend="Προσανατολισμός" name="orientation" type="checkbox" optional options={toChoices(ORIENTATIONS)} defaultValue={d.orientation} />
          <Checkbox className="mt-2" name="orientationUnknown" label="Δεν είναι γνωστός" defaultChecked={d.orientationUnknown} />
        </div>
        <Field
          label="Θέα"
          htmlFor="view"
          optional
          className="sm:col-span-2"
          hint="Περιγράψτε μόνο θέα που υπάρχει πραγματικά από το ακίνητο (π.χ. «θέα στον Λυκαβηττό από το σαλόνι»). Αφήστε κενό αν δεν υπάρχει αξιοσημείωτη θέα."
        >
          <Input id="view" name="view" defaultValue={d.view ?? ""} maxLength={300} />
        </Field>
      </FormSection>

      <FormSection title="Επίπλωση, χρήση και προσβασιμότητα">
        <OptionSelect name="furnished" list={FURNISHED} value={d.furnished} label="Επίπλωση" />
        {purpose !== "RENT" && <OptionSelect name="occupancy" list={OCCUPANCY} value={d.occupancy} label="Κατάσταση χρήσης" />}
        <div className="sm:col-span-2">
          <ChoiceGroup legend="Προσβασιμότητα" name="accessibility" type="checkbox" optional options={toChoices(ACCESSIBILITY)} defaultValue={d.accessibility} />
        </div>
        <Field label="Σημειώσεις προσβασιμότητας" htmlFor="accessibilityNotes" optional className="sm:col-span-2">
          <Input id="accessibilityNotes" name="accessibilityNotes" defaultValue={d.accessibilityNotes ?? ""} maxLength={500} />
        </Field>
      </FormSection>

      <FormSection title="Επιπλέον χαρακτηριστικά και περιορισμοί">
        <div className="sm:col-span-2">
          <ChoiceGroup legend="Επιπλέον χαρακτηριστικά" name="extraFeatures" type="checkbox" optional options={toChoices(features)} defaultValue={d.extraFeatures} />
        </div>
        <Field label="Άλλα σημαντικά χαρακτηριστικά" htmlFor="otherFeatures" optional className="sm:col-span-2" hint="Ό,τι άλλο θέλετε να αναφέρεται. Γράψτε μόνο επιβεβαιωμένα στοιχεία.">
          <Textarea id="otherFeatures" name="otherFeatures" defaultValue={d.otherFeatures ?? ""} rows={3} maxLength={2000} />
        </Field>
        <Field
          label="Περιορισμοί ή γνωστά ζητήματα"
          htmlFor="limitations"
          optional
          className="sm:col-span-2"
          hint="π.χ. «χρειάζεται ανακαίνιση το μπάνιο», «χωρίς ανελκυστήρα στον 4ο όροφο». Θα αναφέρονται με σαφήνεια στην περιγραφή — δεν αποκρύπτονται."
        >
          <Textarea id="limitations" name="limitations" defaultValue={d.limitations ?? ""} rows={3} maxLength={2000} />
        </Field>
      </FormSection>
      <StepFooter />
    </ActionForm>
  );
}
