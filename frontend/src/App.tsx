import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { Landing } from "./pages/Landing";
import { StaffHome } from "./pages/staff/StaffHome";
import { StaffLogin } from "./pages/staff/StaffLogin";
import { StudentHome } from "./pages/student/StudentHome";
import { StudentLogin } from "./pages/student/StudentLogin";
import { TutorHome } from "./pages/tutor/TutorHome";
import { TutorLogin } from "./pages/tutor/TutorLogin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/equipe/connexion" element={<StaffLogin />} />
      <Route
        path="/equipe"
        element={
          <RequireAuth kind="staff" redirectTo="/equipe/connexion">
            <StaffHome />
          </RequireAuth>
        }
      />

      <Route path="/eleve/connexion" element={<StudentLogin />} />
      <Route
        path="/eleve"
        element={
          <RequireAuth kind="student" redirectTo="/eleve/connexion">
            <StudentHome />
          </RequireAuth>
        }
      />

      <Route path="/encadreur/connexion" element={<TutorLogin />} />
      <Route
        path="/encadreur"
        element={
          <RequireAuth kind="tutor" redirectTo="/encadreur/connexion">
            <TutorHome />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
