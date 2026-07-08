import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/booking-page";

export const metadata: Metadata = {
  title: "Agendar cita",
  description: "Solicita tu cita en línea eligiendo el horario que mejor te convenga.",
  robots: { index: false },
};

export default function AgendarPage() {
  return <BookingPage />;
}
