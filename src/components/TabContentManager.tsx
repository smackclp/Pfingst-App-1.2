import React from "react";
import { User, Service, Shift, ShiftAssignment, Conflict, Camp, MaterialItem, FunctionalRole, Community, TalentAct } from "../types";
import DashboardView from "./DashboardView";
import CalendarView from "./CalendarView";
import PeopleView from "./PeopleView";
import ServicesView from "./ServicesView";
import ShiftsView from "./ShiftsView";
import CampsView from "./CampsView";
import PrintView from "./PrintView";
import AlertsView from "./AlertsView";
import MaterialsView from "./MaterialsView";
import CommunitiesView from "./CommunitiesView";
import ProgramView from "./ProgramView";
import LagerHubView from "./LagerHubView";
import VerwaltungHubView from "./VerwaltungHubView";

interface TabContentManagerProps {
  currentTab: string;
  loading: boolean;
  users: User[];
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  conflicts: Conflict[];
  activeCampId: string | null;
  camps: Camp[];
  isAdmin: boolean;
  accessRole?: "helfer" | "bereichsleiter" | "lagerleitung";
  currentUserId: string | null;
  selectShiftId: string | null;
  
  // Upstream state callbacks
  setCurrentTab: (tab: string) => void;
  setSelectShiftId: (id: string | null) => void;
  openStatusModal: (assignmentId: string, _accepted?: boolean) => Promise<void>;

  // Data update handlers from useZeltlagerData
  onAddUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
  onUpdateAccessRole: (id: string, role: "helfer" | "bereichsleiter" | "lagerleitung") => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  
  onAddService: (service: Partial<Service>) => Promise<void>;
  onUpdateService: (id: string, service: Partial<Service>) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
  
  onAddShift: (shift: Partial<Shift>) => Promise<void>;
  onUpdateShift: (id: string, shift: Partial<Shift>) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  
  onAddAssignment: (shiftId: string, userId: string, force?: boolean) => Promise<void>;
  onRemoveAssignment: (shiftId: string, userId: string) => Promise<void>;
  onSetActiveCamp: (id: string) => Promise<void>;
  onCreateCamp: (year: number, copyFromCampId?: string) => Promise<void>;
  onSelectShift: (id: string) => void;

  pwaInstallable?: boolean;
  onTriggerPwaInstall?: () => void;
  onOpenPwaOnboarding?: () => void;

  // Materials props
  materials: MaterialItem[];
  onAddMaterial: (material: Omit<MaterialItem, "id" | "created_at">) => Promise<void>;
  onUpdateMaterial: (id: string, material: Partial<MaterialItem>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;

  // Functional roles props
  functionalRoles: FunctionalRole[];
  onAddRole: (name: string, userId: string | null) => Promise<void>;
  onUpdateRole: (id: string, payload: Partial<FunctionalRole>) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;

  // Communities props
  communities: Community[];
  onAddCommunity: (community: Omit<Community, "id">) => Promise<void>;
  onUpdateCommunity: (id: string, community: Partial<Community>) => Promise<void>;
  onDeleteCommunity: (id: string) => Promise<void>;
  onImportCommunities: (items: Omit<Community, "id" | "camp_id">[]) => Promise<void>;
  onClearCommunities: () => Promise<void>;

  // Talent Acts props
  talentActs: TalentAct[];
  onAddTalentAct: (act: Omit<TalentAct, "id">) => Promise<void>;
  onUpdateTalentAct: (id: string, act: Partial<TalentAct>) => Promise<void>;
  onDeleteTalentAct: (id: string) => Promise<void>;
  onReorderTalentActs: (orders: { [id: string]: number }) => Promise<void>;
  onClearTalentActs: () => Promise<void>;
  onResetDatabase?: (year?: number, mode?: "full" | "shifts_only" | "clear_assignments") => Promise<string>;
}

export default function TabContentManager({
  currentTab,
  loading,
  users,
  services,
  shifts,
  assignments,
  conflicts,
  activeCampId,
  camps,
  isAdmin,
  accessRole = "helfer",
  currentUserId,
  selectShiftId,
  setCurrentTab,
  setSelectShiftId,
  openStatusModal,
  onAddUser,
  onUpdateUser,
  onUpdateAccessRole,
  onDeleteUser,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onAddAssignment,
  onRemoveAssignment,
  onSetActiveCamp,
  onCreateCamp,
  onSelectShift,
  pwaInstallable,
  onTriggerPwaInstall,
  onOpenPwaOnboarding,
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  functionalRoles,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
  communities,
  onAddCommunity,
  onUpdateCommunity,
  onDeleteCommunity,
  onImportCommunities,
  onClearCommunities,
  talentActs,
  onAddTalentAct,
  onUpdateTalentAct,
  onDeleteTalentAct,
  onReorderTalentActs,
  onClearTalentActs,
  onResetDatabase,
}: TabContentManagerProps) {
  // "isAdmin" ist bewusst nur Lagerleitung (Personen/Lager-Verwaltung).
  // "canManage" (Bereichsleitung ODER Lagerleitung) gilt für alle operativen Planungs-
  // aufgaben, die laut Backend bereits Bereichsleitung erlaubt sind (Schichten, Dienste,
  // Dashboard-Auswertungen) - hier wird das jetzt auch in der Oberfläche konsistent gemacht.
  const canManage = accessRole !== "helfer";

  const activeCamp = React.useMemo(() => {
    return camps.find((c) => c.id === activeCampId);
  }, [camps, activeCampId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20"></div>
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
          CALIBRATING_ZELTLAGER_DATABASE...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {currentTab === "dashboard" && (
        <DashboardView
          users={users}
          services={services}
          shifts={shifts}
          assignments={assignments}
          conflicts={conflicts}
          communities={communities}
          onNavigateToTab={setCurrentTab}
          onSelectShift={onSelectShift}
          onAddAssignment={onAddAssignment}
          onRemoveAssignment={onRemoveAssignment}
          activeCamp={activeCamp}
          isAdmin={canManage}
          currentUserId={currentUserId}
          pwaInstallable={pwaInstallable}
          onTriggerPwaInstall={onTriggerPwaInstall}
          onOpenPwaOnboarding={onOpenPwaOnboarding}
        />
      )}

      {currentTab === "calendar" && (
        <CalendarView
          users={users}
          services={services}
          shifts={shifts}
          assignments={assignments}
          conflicts={conflicts}
          currentUserId={currentUserId}
          isAdmin={canManage}
          onAddAssignment={onAddAssignment}
          onRemoveAssignment={onRemoveAssignment}
          onToggleAssignmentAccepted={openStatusModal}
          onSelectShiftId={selectShiftId}
          onClearSelectShiftId={() => setSelectShiftId(null)}
          onOpenAddShiftModal={() => setCurrentTab("shifts")}
          activeCamp={activeCamp}
        />
      )}

      {currentTab === "people" && (
        <PeopleView
          users={users}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onUpdateAccessRole={onUpdateAccessRole}
          onDeleteUser={onDeleteUser}
          isAdmin={isAdmin}
          functionalRoles={functionalRoles}
          onAddRole={onAddRole}
          onUpdateRole={onUpdateRole}
          onDeleteRole={onDeleteRole}
        />
      )}

      {currentTab === "services" && (
        <ServicesView
          services={services}
          users={users}
          shifts={shifts}
          onAddService={onAddService}
          onUpdateService={onUpdateService}
          onDeleteService={onDeleteService}
          onAddShift={onAddShift}
          onDeleteShift={onDeleteShift}
          isAdmin={canManage}
          activeCamp={activeCamp}
        />
      )}

      {currentTab === "shifts" && (
        <ShiftsView
          shifts={shifts}
          services={services}
          users={users}
          assignments={assignments}
          onAddShift={onAddShift}
          onUpdateShift={onUpdateShift}
          onDeleteShift={onDeleteShift}
          onAddAssignment={onAddAssignment}
          onRemoveAssignment={onRemoveAssignment}
          onToggleAssignmentAccepted={openStatusModal}
          isAdmin={canManage}
          activeCamp={activeCamp}
          currentUserId={currentUserId}
        />
      )}

      {currentTab === "camps" && (
        <CampsView
          camps={camps}
          activeCampId={activeCampId}
          onSetActiveCamp={onSetActiveCamp}
          onCreateCamp={onCreateCamp}
          onResetDatabase={onResetDatabase}
        />
      )}

      {currentTab === "print" && (
        <PrintView
          shifts={shifts}
          services={services}
          users={users}
          assignments={assignments}
          activeCamp={activeCamp}
          onBackToDashboard={() => setCurrentTab("dashboard")}
        />
      )}

      {currentTab === "alerts" && (
        <AlertsView
          currentUser={users.find((u) => u.id === currentUserId) || null}
          users={users}
          onUpdateUser={onUpdateUser}
        />
      )}

      {currentTab === "materials" && (
        <MaterialsView
          materials={materials}
          users={users}
          currentUserId={currentUserId}
          isAdmin={canManage}
          onAddMaterial={onAddMaterial}
          onUpdateMaterial={onUpdateMaterial}
          onDeleteMaterial={onDeleteMaterial}
        />
      )}

      {currentTab === "communities" && (
        <CommunitiesView
          communities={communities}
          isAdmin={canManage}
          onAddCommunity={onAddCommunity}
          onUpdateCommunity={onUpdateCommunity}
          onDeleteCommunity={onDeleteCommunity}
          onImportCommunities={onImportCommunities}
          onClearCommunities={onClearCommunities}
        />
      )}

      {currentTab === "program" && (
        <ProgramView
          talentActs={talentActs}
          communities={communities}
          users={users}
          currentUserId={currentUserId}
          isAdmin={true}
          onAddTalentAct={onAddTalentAct}
          onUpdateTalentAct={onUpdateTalentAct}
          onDeleteTalentAct={onDeleteTalentAct}
          onReorderTalentActs={onReorderTalentActs}
          onClearTalentActs={onClearTalentActs}
        />
      )}

      {currentTab === "lager" && <LagerHubView setCurrentTab={setCurrentTab} />}

      {currentTab === "verwaltung" && (
        <VerwaltungHubView setCurrentTab={setCurrentTab} accessRole={accessRole} />
      )}
    </div>
  );
}
