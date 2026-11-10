'use client';

import { useProfile } from "@/context/ProfileContext";
import useInstitutionResource from "@/hooks/useInstitutionResource";
import {
    getAttendanceData,
    getClassesSchedulesData,
    getCommunicationsData,
    getDashboardData,
    getPaymentsData,
    getPeopleData,
    getSchoolYearData,
    getSettingsData,
} from "@/services/institutionDataService";

function useInstitutionDataset(loader) {
    const { currentInstitution, loading: profileLoading } = useProfile();
    const resource = useInstitutionResource(loader, currentInstitution?.id);
    return {
        ...resource,
        currentInstitution,
        loading: profileLoading || resource.loading,
    };
}

export const useDashboardData = () => useInstitutionDataset(getDashboardData);
export const useAttendanceData = () => useInstitutionDataset(getAttendanceData);
export const useCommunicationsData = () => useInstitutionDataset(getCommunicationsData);
export const usePaymentsData = () => useInstitutionDataset(getPaymentsData);
export const useSchoolYearData = () => useInstitutionDataset(getSchoolYearData);
export const useClassesSchedulesData = () => useInstitutionDataset(getClassesSchedulesData);
export const usePeopleData = () => useInstitutionDataset(getPeopleData);
export const useSettingsData = () => useInstitutionDataset(getSettingsData);
