'use client';

import { useCallback } from "react";
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
} from "@/services/institutionData.services";
import { insertAcademicYear, insertClassroom, insertClassrooms, insertEnrollment } from "@/services/schoolYear.services";
import { createAcademicRecords, removeAcademicRecord, updateAcademicRecord } from "@/services/classesSchedules.services";
import { managePerson, registerPeople } from "@/services/people.services";

function useInstitutionDataset(loader) {
    const { currentInstitution, currentMembership, loading: profileLoading } = useProfile();
    const resource = useInstitutionResource(loader, currentInstitution?.id);
    return {
        ...resource,
        currentInstitution,
        currentMembership,
        loading: profileLoading || resource.loading,
    };
}

export const useDashboardData = () => useInstitutionDataset(getDashboardData);
export const useAttendanceData = () => useInstitutionDataset(getAttendanceData);
export const useCommunicationsData = () => useInstitutionDataset(getCommunicationsData);
export const usePaymentsData = () => useInstitutionDataset(getPaymentsData);
export function useSchoolYearData() {
    const dataset = useInstitutionDataset(getSchoolYearData);
    const { currentInstitution, currentMembership, refresh } = dataset;
    const institutionId = currentInstitution?.id;
    const canManage = currentMembership?.role === "ADMIN" && currentMembership?.status === "ACTIVE";

    const createRecord = useCallback(async (insertRecord, values) => {
        if (!canManage) {
            return { data: null, error: new Error("Necesitas una membresía ADMIN activa para crear estos registros.") };
        }

        const result = await insertRecord(institutionId, values);
        if (!result.error) await refresh();
        return result;
    }, [canManage, institutionId, refresh]);

    const createAcademicYear = useCallback(values => createRecord(insertAcademicYear, values), [createRecord]);
    const createClassroom = useCallback(values => createRecord(insertClassroom, values), [createRecord]);
    const createEnrollment = useCallback(values => createRecord(insertEnrollment, values), [createRecord]);
    const createClassrooms = useCallback(async (academicYearId, classrooms) => {
        if (!canManage) {
            return { data: null, error: new Error("Necesitas una membresía ADMIN activa para crear estos registros.") };
        }
        const result = await insertClassrooms(institutionId, academicYearId, classrooms);
        if (!result.error) await refresh();
        return result;
    }, [canManage, institutionId, refresh]);

    return { ...dataset, canManage, createAcademicYear, createClassroom, createClassrooms, createEnrollment };
}
export function useClassesSchedulesData() {
    const dataset = useInstitutionDataset(getClassesSchedulesData);
    const { currentInstitution, currentMembership, refresh } = dataset;
    const institutionId = currentInstitution?.id;
    const canManage = currentMembership?.role === "ADMIN" && currentMembership?.status === "ACTIVE";
    const assertCanManage = useCallback(() => {
        if (!canManage || !institutionId) throw new Error("Necesitas una membresía ADMIN activa para gestionar las clases y horarios.");
    }, [canManage, institutionId]);
    const createRecords = useCallback(async (kind, rows) => {
        assertCanManage();
        const result = await createAcademicRecords(institutionId, kind, Array.isArray(rows) ? rows : [rows]);
        if (result.error) throw new Error(result.error.message);
        await refresh();
        return result.data;
    }, [assertCanManage, institutionId, refresh]);
    const updateRecord = useCallback(async (kind, id, values) => {
        assertCanManage();
        const result = await updateAcademicRecord(institutionId, kind, id, values);
        if (result.error) throw new Error(result.error.message);
        await refresh();
        return result.data;
    }, [assertCanManage, institutionId, refresh]);
    const deleteRecord = useCallback(async (kind, id) => {
        assertCanManage();
        const result = await removeAcademicRecord(institutionId, kind, id);
        if (result.error) throw new Error(result.error.message);
        await refresh();
    }, [assertCanManage, institutionId, refresh]);
    return { ...dataset, canManage, createRecords, updateRecord, deleteRecord };
}
export function usePeopleData() {
    const dataset = useInstitutionDataset(getPeopleData);
    const { currentInstitution, currentMembership, refresh } = dataset;
    const institutionId = currentInstitution?.id;
    const canManage = currentMembership?.role === "ADMIN" && currentMembership?.status === "ACTIVE";
    const createPeople = useCallback(async payload => {
        if (!canManage || !institutionId) throw new Error("Necesitas una membresía ADMIN activa para registrar personas.");
        const result = await registerPeople({ ...payload, institutionId });
        await refresh();
        return result;
    }, [canManage, institutionId, refresh]);
    const actOnPerson = useCallback(async (action, person, values) => {
        if (!canManage || !institutionId) throw new Error("Necesitas una membresía ADMIN activa para gestionar personas.");
        const result = await managePerson(action, { ...person, institutionId }, values);
        await refresh();
        return result;
    }, [canManage, institutionId, refresh]);
    return { ...dataset, canManage, createPeople, actOnPerson };
}
export const useSettingsData = () => useInstitutionDataset(getSettingsData);
