import { VehicleForm } from "@/components/admin/vehicle-form";

export const metadata = { title: "Véhicule" };

export default async function AdminVehiclePage(props: PageProps<"/admin/vehicules/[id]">) {
  const { id } = await props.params;
  return <VehicleForm id={id} />;
}
