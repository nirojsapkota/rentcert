"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ADDRESS_QUERY_MIN, type AddressSuggestion } from "@/lib/address-suggestion";

type Props = {
  defaultValue: string;
  error?: string;
};

const DEBOUNCE_MS = 300;

// Fill the rest of the address fields in the same form. Every field stays editable, because
// suggestions can miss unit numbers or use a different locality name.
function fillForm(input: HTMLInputElement, suggestion: AddressSuggestion) {
  const form = input.form;
  if (!form) return;
  const set = (name: string, value: string) => {
    const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    if (field && value) field.value = value;
  };
  input.value = suggestion.addressLine1;
  set("suburb", suggestion.suburb);
  set("state", suggestion.state);
  set("postcode", suggestion.postcode);
}

// Street address field with suggestions from /api/address-search (ARIA 1.2 combobox pattern).
export function AddressAutocomplete({ defaultValue, error }: Props) {
  const id = "addressLine1";
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const text = query.trim();
    if (text.length < ADDRESS_QUERY_MIN) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(text)}`, { signal: controller.signal });
        const body = response.ok ? ((await response.json()) as { suggestions: AddressSuggestion[] }) : { suggestions: [] };
        setSuggestions(body.suggestions);
        setActive(-1);
        setOpen(body.suggestions.length > 0);
        setStatus(body.suggestions.length > 0 ? `${body.suggestions.length} address suggestions available.` : "");
      } catch {
        // Aborted or offline: typing the address still works.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(suggestion: AddressSuggestion) {
    if (inputRef.current) fillForm(inputRef.current, suggestion);
    setOpen(false);
    setSuggestions([]);
    setStatus(`Filled in ${suggestion.label}. Check the fields below.`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const hintId = `${id}-hint`;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        Street address
      </label>
      <input
        ref={inputRef}
        id={id}
        name="addressLine1"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ")}
        autoComplete="off"
        defaultValue={defaultValue}
        onChange={(event) => {
          setQuery(event.target.value);
          if (event.target.value.trim().length < ADDRESS_QUERY_MIN) {
            setSuggestions([]);
            setOpen(false);
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base aria-invalid:border-danger"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Address suggestions"
        hidden={!open}
        className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-lg"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.label}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            // mousedown, so the choice lands before the input's blur closes the list
            onMouseDown={(event) => {
              event.preventDefault();
              choose(suggestion);
            }}
            className="cursor-pointer px-3 py-2.5 text-sm aria-selected:bg-brand-soft hover:bg-brand-soft"
          >
            {suggestion.label}
          </li>
        ))}
      </ul>
      <p id={hintId} className="text-sm text-ink-muted">
        Start typing to search, or enter the address yourself. Address search by{" "}
        <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer" className="underline">
          Geoapify
        </a>
        , ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
          OpenStreetMap
        </a>{" "}
        contributors.
      </p>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
