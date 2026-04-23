/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Step {
  id: string;
  label: string;
  isCompleted: boolean;
  system?: string; // e.g., 'impower', 'everreal'
  description?: string;
}

export interface Project {
  id: string;
  apartmentName: string;
  currentTenant: string;
  owner: string;
  ownerEmail: string;
  terminationDate: string;
  createdAt: number;
  createdBy: string;
  isArchived: boolean;
  steps: Step[];
}

export const DEFAULT_STEPS: Omit<Step, 'id'>[] = [
  { label: 'Kündigungsbestätigung (Serienbrief)', isCompleted: false, system: 'impower', description: 'Bestätigung an den Mieter schicken.' },
  { label: 'Eigentümer benachrichtigen', isCompleted: false, description: 'E-Mail an den Eigentümer über die Kündigung.' },
  { label: 'Vorabnahmetermin vereinbaren & durchführen', isCompleted: false, description: 'Termin mit dem Mieter zur ersten Prüfung.' },
  { label: 'Anzeige-Entwurf erstellen', isCompleted: false, system: 'everreal', description: 'Anzeige grob vorbereiten (noch nicht online).' },
  { label: 'Anzeige fertigstellen & inserieren', isCompleted: false, system: 'everreal', description: 'Fotos einpflegen und Anzeige online stellen.' },
  { label: 'Abnahme mit Vormieter', isCompleted: false, description: 'Finale Prüfung und Rücknahme der Wohnung.' },
  { label: 'Übergabe an Nachmieter', isCompleted: false, description: 'Einzug des neuen Mieters.' },
  { label: 'Mieterdaten in impower aktualisieren', isCompleted: false, system: 'impower', description: 'Stammdatenanpassung nach Mieterwechsel.' },
  { label: 'Wohnungsgeberbescheinigung schicken', isCompleted: false, description: 'Bescheinigung für den Einzug des neuen Mieters ausstellen.' },
  { label: 'casavi Einladung schicken', isCompleted: false, system: 'casavi', description: 'Einladung zum Mieterportal versenden.' },
];
