import { createFileRoute } from "@tanstack/react-router";
import Header from "../components/Header";
import Slider from "../components/Slider";
import { Dropdown } from "primereact/dropdown";
import { useState } from "react";
import { FloatLabel } from "primereact/floatlabel";
import { Button } from "primereact/button";
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [selectedCity, setSelectedCity] = useState<String | null>(null);
  const cities = [
    { name: "New York", code: "NY" },
    { name: "Rome", code: "RM" },
    { name: "London", code: "LDN" },
    { name: "Istanbul", code: "IST" },
    { name: "Paris", code: "PRS" },
  ];
  return (
    <div className="hom_page_container">
      <Header message="shahbaaz" />
      <Slider />
      {/* <FloatLabel>
        <Dropdown
          filter
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.value)}
          options={cities}
          optionLabel="name"
          // placeholder="Select a City"
          className="w-full md:w-14rem"
          showClear
        />
        <label htmlFor="dd-city">Select a City</label>
      </FloatLabel> */}

      <Button label="Submit" />
    </div>
  );
}
