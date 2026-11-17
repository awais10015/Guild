"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_CITY_SELECT_VALUE,
  GLOBAL_COUNTRIES,
  citiesForCountry,
  findCityInfo,
  defaultCountryForCity,
} from "@/lib/constants";

export interface LocationCountryCityValue {
  country: string;
  city: string;
}

interface Props {
  value: LocationCountryCityValue;
  onChange: (next: LocationCountryCityValue, coords?: { lat: number; lng: number } | null) => void;
  cityLabel?: string;
  countryLabel?: string;
  required?: boolean;
  allowCustomCity?: boolean;
  className?: string;
}

export function LocationCountryCitySelect({
  value,
  onChange,
  cityLabel = "City",
  countryLabel = "Country",
  required = false,
  allowCustomCity = true,
  className,
}: Props) {
  const knownInCountry = useMemo(
    () => !!findCityInfo(value.city, value.country),
    [value.city, value.country],
  );
  const [citySelect, setCitySelect] = useState(
    () => (knownInCountry ? value.city : allowCustomCity ? CUSTOM_CITY_SELECT_VALUE : value.city),
  );
  const [customCity, setCustomCity] = useState(() => (knownInCountry ? "" : value.city));

  useEffect(() => {
    const known = !!findCityInfo(value.city, value.country);
    if (known) {
      setCitySelect(value.city);
      setCustomCity("");
    } else if (value.city && allowCustomCity) {
      setCitySelect(CUSTOM_CITY_SELECT_VALUE);
      setCustomCity(value.city);
    }
  }, [value.city, value.country, allowCustomCity]);

  const displayCountry =
    value.country ||
    (value.city ? defaultCountryForCity(value.city, GLOBAL_COUNTRIES[0] ?? "") : "") ||
    GLOBAL_COUNTRIES[0] ||
    "";

  const cityOptions = useMemo(() => citiesForCountry(displayCountry), [displayCountry]);

  function activeCountry() {
    return value.country || displayCountry;
  }

  const customOnly = allowCustomCity && !!displayCountry && cityOptions.length === 0;

  useEffect(() => {
    if (customOnly && citySelect !== CUSTOM_CITY_SELECT_VALUE) {
      setCitySelect(CUSTOM_CITY_SELECT_VALUE);
    }
  }, [customOnly, citySelect]);

  function onCountryChange(country: string) {
    const options = citiesForCountry(country);
    const first = options[0];
    if (first) {
      onChange({ country, city: first.name }, { lat: first.lat, lng: first.lng });
      setCitySelect(first.name);
      setCustomCity("");
    } else if (allowCustomCity) {
      onChange({ country, city: "" }, null);
      setCitySelect(CUSTOM_CITY_SELECT_VALUE);
      setCustomCity("");
    } else {
      onChange({ country, city: "" }, null);
      setCitySelect("");
      setCustomCity("");
    }
  }

  function onCitySelectChange(selected: string) {
    setCitySelect(selected);
    const country = activeCountry();
    if (selected === CUSTOM_CITY_SELECT_VALUE) {
      const name = customCity.trim();
      onChange({ country, city: name }, null);
      return;
    }
    const info = findCityInfo(selected, country);
    onChange({ country, city: selected }, info ? { lat: info.lat, lng: info.lng } : null);
    setCustomCity("");
  }

  function onCustomCityBlur() {
    const name = customCity.trim();
    if (citySelect !== CUSTOM_CITY_SELECT_VALUE) return;
    onChange({ country: activeCountry(), city: name }, null);
  }

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>
            {countryLabel}
            {required ? " *" : ""}
          </Label>
          <Select value={displayCountry || undefined} onValueChange={onCountryChange}>
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {GLOBAL_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!customOnly ? (
          <div>
            <Label>
              {cityLabel}
              {required ? " *" : ""}
            </Label>
            <Select
              value={citySelect || undefined}
              onValueChange={onCitySelectChange}
              disabled={!displayCountry}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder={displayCountry ? "Select city" : "Choose country first"} />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
                {allowCustomCity && displayCountry ? (
                  <SelectItem value={CUSTOM_CITY_SELECT_VALUE}>Other city (type below)</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="custom-city-name-inline">
              {cityLabel}
              {required ? " *" : ""}
            </Label>
            <Input
              id="custom-city-name-inline"
              value={customCity}
              onChange={(e) => {
                setCustomCity(e.target.value);
                onChange({ country: activeCountry(), city: e.target.value.trim() }, null);
              }}
              onBlur={onCustomCityBlur}
              placeholder="Enter your city"
              className="mt-1.5"
              maxLength={60}
            />
            <p className="mt-1 text-xs text-muted-foreground">Set your map pin below after entering your city.</p>
          </div>
        )}
      </div>
      {allowCustomCity && !customOnly && citySelect === CUSTOM_CITY_SELECT_VALUE && (
        <div className="mt-3">
          <Label htmlFor="custom-city-name">City name</Label>
          <Input
            id="custom-city-name"
            value={customCity}
            onChange={(e) => {
              setCustomCity(e.target.value);
              onChange({ country: activeCountry(), city: e.target.value.trim() }, null);
            }}
            onBlur={onCustomCityBlur}
            placeholder="Enter your city"
            className="mt-1.5"
            maxLength={60}
          />
          <p className="mt-1 text-xs text-muted-foreground">Use the map below to set your pin if the city is not in the list.</p>
        </div>
      )}
    </div>
  );
}