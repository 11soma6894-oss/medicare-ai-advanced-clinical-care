export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image: string;
  about: string;
  isFree?: boolean;
  gender?: 'male' | 'female';
}

export interface ConsultationRecord {
  id: string;
  userId: string;
  userName: string;
  doctorName: string;
  symptoms: string;
  diagnosis: string;
  prescription: {
    medicines: {
      name: string;
      dosage: string;
      frequency: string;
    }[];
    yoga: string[];
  };
  startTime: number;
  aiAgentResponseTime: number;
  userResponseTime: number;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  medicalHistory: string;
  createdAt: number;
}
