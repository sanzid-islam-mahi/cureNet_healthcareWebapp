import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppPageHeader from '../components/AppPageHeader';
import MedicalImagingList from '../components/MedicalImagingList';
import { api } from '../context/AuthContext';
import type { MedicalImagingRecord } from '../types/medicalImaging';
import { useState } from 'react';
import AppointmentImagingModal from '../components/AppointmentImagingModal';

export default function PatientImaging() {
  const [addingExternal, setAddingExternal] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['patient-imaging'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: { records: MedicalImagingRecord[] } }>('/imaging/my');
      return response.data.data.records;
    },
  });

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Patient Record"
        title="Medical Imaging"
        description="Review imaging studies uploaded by your care team, including linked visits and attached report summaries."
        actions={
          <>
            <Link
              to="/app/patient-medical-history"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to history
            </Link>
            <Link
              to="/app/patient-appointments"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              View appointments
            </Link>
            <button
              type="button"
              onClick={() => setAddingExternal(true)}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add external imaging
            </button>
          </>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading imaging records...</p>
        ) : (
          <MedicalImagingList
            records={data ?? []}
            emptyMessage="No imaging records are available yet. Records uploaded by your doctor will appear here."
          />
        )}
      </section>

      {addingExternal ? (
        <AppointmentImagingModal
          scope="external"
          onClose={() => setAddingExternal(false)}
        />
      ) : null}
    </div>
  );
}
