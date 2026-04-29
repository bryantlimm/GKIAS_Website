export type KaosSize = "S" | "M" | "L" | "XL" | "XXL";
export type TipeKamar = "isi4" | "isi3" | "isi2";
export type Transportasi = "bus" | "mobil_sendiri";
export type RegistrationStatus = "registered" | "approved" | "checked_in";

export interface RetreatMember {
  namaLengkap: string;
  nomorTelpon: string;
  umur: number;
  alamatRumah: string;
  ukuranKaos: KaosSize;
  transportasi: Transportasi;
  jemaat: boolean;
  tipeKamar: TipeKamar;
  hargaKamar: number;
  relasi: string;
  kamar: string;
  isMain: boolean;
}

export interface RetreatRegistration {
    id?: string;
    uid: string;
    email: string;
    createdAt: any;
    status: RegistrationStatus;
    qrCode: string;
    paymentProofUrl: string;
    totalAmount: number;
    members: RetreatMember[];
    sponsorCount: number;
}

export interface RetreatConfig {
  title: string;
  theme: string;
  date: string;
  location: string;
  capacity: number;
  speakerNames: string[];
  description: string;
  bankAccount: string;
  bankName: string;
  bankHolder: string;
  posterUrl: string;
  bannerUrl: string;
  isOpen: boolean;
}

// Pricing constants
export const HARGA_JEMAAT: Record<TipeKamar, number> = {
  isi4: 470000,
  isi3: 570000,
  isi2: 670000,
};

export const HARGA_NON_JEMAAT: Record<TipeKamar, number> = {
  isi4: 600000,
  isi3: 700000,
  isi2: 800000,
};

export const LABEL_TIPE_KAMAR: Record<TipeKamar, string> = {
  isi4: "Kamar isi 4",
  isi3: "Kamar isi 3",
  isi2: "Kamar isi 2",
};