/**
 * MDM profili po modelu uređaja.
 * Lista profila za dropdown "Naziv profila" zavisi od izabranog "Model uređaja".
 */
export const DEVICE_MODELS = [
  'Android Phone/Tablet',
  'Cloud Middleware',
  'Cloud POS',
  'PC',
  'Telpo TPS900',
  'UROVO i9100',
] as const;

export type DeviceModelKey = (typeof DEVICE_MODELS)[number];

export interface MdmProfileOption {
  value: string;
  label: string;
  isDefault: boolean;
}

export const MDM_PROFILES_BY_MODEL: Record<string, MdmProfileOption[]> = {
  'Android Phone/Tablet': [
    { value: '03. Teron Phone/Tablet (podrazumevano)', label: '03. Teron Phone/Tablet (podrazumevano)', isDefault: true },
    { value: '06. Teron P8/P9', label: '06. Teron P8/P9', isDefault: false },
    { value: '07. Teron Z92 Android 11+', label: '07. Teron Z92 Android 11+', isDefault: false },
    { value: '08. Teron Kiosk', label: '08. Teron Kiosk', isDefault: false },
    { value: '08. Teron Kiosk (stari)', label: '08. Teron Kiosk (stari)', isDefault: false },
    { value: '09. Teron Android 6', label: '09. Teron Android 6', isDefault: false },
    { value: 'Test - Teron Phone/Tablet', label: 'Test - Teron Phone/Tablet', isDefault: false },
    { value: 'Dev - Teron P8/P9', label: 'Dev - Teron P8/P9', isDefault: false },
  ],
  PC: [
    { value: '04. Teron PC (podrazumevano)', label: '04. Teron PC (podrazumevano)', isDefault: true },
    { value: '14. Test - Teron PC', label: '14. Test - Teron PC', isDefault: false },
    { value: '24. Dev - Teron PC', label: '24. Dev - Teron PC', isDefault: false },
  ],
  'Cloud POS': [
    { value: '05. Teron Cloud POS (podrazumevano)', label: '05. Teron Cloud POS (podrazumevano)', isDefault: true },
    { value: '15. Test - Teron Cloud POS', label: '15. Test - Teron Cloud POS', isDefault: false },
    { value: '25. Dev - Teron Cloud POS', label: '25. Dev - Teron Cloud POS', isDefault: false },
  ],
  'Telpo TPS900': [
    { value: '01. Teron TPS900 (podrazumevano)', label: '01. Teron TPS900 (podrazumevano)', isDefault: true },
    { value: '11. Test - Teron TPS900', label: '11. Test - Teron TPS900', isDefault: false },
    { value: '21. Dev - Teron TPS900', label: '21. Dev - Teron TPS900', isDefault: false },
    { value: '92. Test - TPS900 LPFR+ESIR+PT', label: '92. Test - TPS900 LPFR+ESIR+PT', isDefault: false },
    { value: '93. Dev - TPS900 LPFR+ESIR+PT', label: '93. Dev - TPS900 LPFR+ESIR+PT', isDefault: false },
  ],
  'UROVO i9100': [
    { value: '02. Teron I9100 (podrazumevano)', label: '02. Teron I9100 (podrazumevano)', isDefault: true },
    { value: '12. Test - Teron I9100', label: '12. Test - Teron I9100', isDefault: false },
    { value: '22. Dev - Teron I9100', label: '22. Dev - Teron I9100', isDefault: false },
  ],
  'Cloud Middleware': [
    { value: 'podrazumevano', label: 'podrazumevano', isDefault: true },
  ],
};

/** Vraća listu MDM profila za dati model; ako model nije u mapi, prazna lista. */
export function getMdmProfilesForModel(model: string | null | undefined): MdmProfileOption[] {
  if (!model?.trim()) return [];
  const key = model.trim();
  return MDM_PROFILES_BY_MODEL[key] ?? [];
}

/** Vraća podrazumevani (default) profil za model, ili prvi u listi, ili prazan string. */
export function getDefaultMdmProfileForModel(model: string | null | undefined): string {
  const profiles = getMdmProfilesForModel(model);
  const defaultProfile = profiles.find((p) => p.isDefault) ?? profiles[0];
  return defaultProfile?.value ?? '';
}
