/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from "../types";

export async function draftOwnerEmail(project: Project) {
  const prompt = `Erstelle einen professionellen Entwurf für eine E-Mail an den Eigentümer ${project.owner}.
Informiere ihn darüber, dass sein Mieter ${project.currentTenant} die Wohnung ${project.apartmentName} gekündigt hat.
Erwähne, dass wir bereits die Kündigung bestätigt haben und nun mit der Neuvermittlung beginnen.
Halte den Ton sachlich und professionell.`;

  try {
    const response = await fetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    return data.text || "Fehler beim Erstellen des Entwurfs.";
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return "Fehler beim Erstellen des Entwurfs.";
  }
}

export async function draftTerminationConfirmation(project: Project) {
  const prompt = `Erstelle einen Entwurf für eine Kündigungsbestätigung für den Mieter ${project.currentTenant} für die Wohnung ${project.apartmentName}.
Die Kündigung wurde fristgerecht zum ${project.terminationDate} eingereicht.
Erwähne, dass in Kürze ein Vorabnahmetermin vereinbart wird.`;

  try {
    const response = await fetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    return data.text || "Fehler beim Erstellen der Bestätigung.";
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return "Fehler beim Erstellen der Bestätigung.";
  }
}
