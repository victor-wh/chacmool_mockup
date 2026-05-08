import { useState, useMemo, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import { employeesAPI, aciertosAPI, kpisAPI, eval360API, empleadoAAPI } from './services/api';
import Dashboard from './pages/Dashboard';
import EmpleadoAPage from './pages/EmpleadoA';
import KPIsView from './pages/KPIsView';
import Evaluations360View from './pages/Evaluations360View';
import PDIView from './pages/PDIView';
import EmployeeProfile from './pages/EmployeeProfile';
import ProcessHome from './pages/process/ProcessHome';
import MyProcesses from './pages/process/MyProcesses';
import AuditList from './pages/audits/AuditList';
import AuditForm from './pages/audits/AuditForm';
import AuditDetail from './pages/audits/AuditDetail';
import AuditCorrectivePlanPage from './pages/audits/AuditCorrectivePlanPage';
import ProcessTreeDropdown from './components/ProcessTreeDropdown';
import MyAssignedSteps from './pages/process/MyAssignedSteps';
import MyExecutions from './pages/process/MyExecutions';
import ExecutionDetail from './pages/process/ExecutionDetail';
import ProcessList from './pages/process/ProcessList';
import ProcessForm from './pages/process/ProcessForm';
import ProcessDetail from './pages/process/ProcessDetail';
import ProcessInfo from './pages/process/ProcessInfo';
import ProcessTypes from './pages/process/ProcessTypes';
import ConsequenceSystems from './pages/process/ConsequenceSystems';
import ProcessDashboard from './pages/process/ProcessDashboard';
import AdminExecutions from './pages/process/AdminExecutions';
import ProcessSchedule from './pages/process/ProcessSchedule';
import { 
  Users, 
  Target, 
  MessageSquare, 
  User, 
  Grid3X3, 
  ClipboardEdit,
  ChevronRight,
  PlayCircle,
  Workflow,
  TrendingUp,
  Award,
  BarChart3,
  LayoutDashboard,
  Plus,
  Trash2,
  Search,
  Building2,
  ChevronDown,
  Check,
  X,
  Copy,
  FileText,
  Link,
  ExternalLink,
  Eye,
  Settings,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Send,
  BarChart2,
  PieChart,
  Activity,
  Zap,
  Flag,
  Calendar,
  Edit3,
  Share2,
  UserCheck,
  FolderOpen,
  ClipboardCheck,
  Briefcase,
  Users2,
  Star,
  Info,
  ArrowUp,
  ArrowRight,
  UserPlus,
  Mail,
  EyeOff,
  Shield,
  Percent,
  Save,
  PlusCircle,
  MinusCircle,
  ClipboardList,
  LayoutGrid,
  List,
  AlertCircle,
  CalendarClock,
  LogOut
} from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart as RechartsPie, Pie, Cell } from 'recharts';

// ============================================
// USER ROLE (for demo - toggle between admin/employee)
// ============================================
const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(true);
  return { isAdmin, setIsAdmin };
};

// ============================================
// CLASSIFICATION SYSTEM - "EMPLEADO A" naming
// ============================================

const classificationMatrix = {
  "A": { 
    valores: { min: 81, max: 100 }, 
    resultados: { min: 81, max: 100 },
    label: "Empleado A", 
    shortDesc: "Top Performer",
    description: "Espectaculares. Da resultados. Independientes. Les das qué hacer y traen los resultados. Aspiran a gerentes o supervisores.",
    color: "green",
    action: "Retener y desarrollar para roles de liderazgo"
  },
  "B2": { 
    valores: { min: 81, max: 100 }, 
    resultados: { min: 61, max: 80 },
    label: "Futuro A", 
    shortDesc: "Casi llega",
    description: "Tiene valores y está cerca de dar resultados completos. Con coaching puede llegar a ser Empleado A.",
    color: "yellow",
    action: "Coaching intensivo en resultados"
  },
  "B3": { 
    valores: { min: 81, max: 100 }, 
    resultados: { min: 0, max: 60 },
    label: "Quiere ser A", 
    shortDesc: "Valores sin resultados",
    description: "Tiene los valores, pero no da resultados. Está en el puesto incorrecto. La estrategia de entrenamiento no es correcta.",
    color: "orange",
    action: "Reubicar o ajustar estrategia de entrenamiento"
  },
  "B1": { 
    valores: { min: 61, max: 80 }, 
    resultados: { min: 61, max: 80 },
    label: "Performer Sólido", 
    shortDesc: "Consistente",
    description: "Tiene valores y da resultados de forma consistente. Pilar del equipo.",
    color: "yellow",
    action: "Desarrollar valores para alcanzar nivel A"
  },
  "B4": { 
    valores: { min: 61, max: 80 }, 
    resultados: { min: 81, max: 100 },
    label: "Alto Potencial", 
    shortDesc: "Muy cerca de A",
    description: "Quieren ser Empleados A. Tiene valores y da resultados. Muy cerca de lograrlo.",
    color: "yellow-light",
    action: "Reforzar valores para promoción"
  },
  "C4": { 
    valores: { min: 61, max: 80 }, 
    resultados: { min: 0, max: 60 },
    label: "En Desarrollo", 
    shortDesc: "Necesita mejora",
    description: "Valores aceptables pero resultados bajos. Requiere plan de mejora con seguimiento.",
    color: "orange",
    action: "Plan de mejora con seguimiento cercano"
  },
  "C3": { 
    valores: { min: 0, max: 60 }, 
    resultados: { min: 81, max: 100 },
    label: "Difícil de Sacar", 
    shortDesc: "Resultados sin valores",
    description: "Genera muchos resultados, pero no tiene valores. Persona que puede ser tóxica para el equipo.",
    color: "red",
    action: "Coaching urgente en valores o desvincular"
  },
  "C2": { 
    valores: { min: 0, max: 60 }, 
    resultados: { min: 61, max: 80 },
    label: "Bajo Rendimiento", 
    shortDesc: "En riesgo",
    description: "Ni valores ni resultados destacables. Necesita intervención.",
    color: "red-light",
    action: "Plan de mejora o desvincular"
  },
  "C1": { 
    valores: { min: 0, max: 60 }, 
    resultados: { min: 0, max: 60 },
    label: "Acción Urgente", 
    shortDesc: "Crítico",
    description: "Sin valores ni resultados. Requiere acción inmediata.",
    color: "red",
    action: "Desvincular"
  }
};

const classificationColors = {
  green: { bg: "#ECFDF5", border: "#10B981", text: "#047857", gradient: "from-green-500 to-emerald-600" },
  "yellow-light": { bg: "#FEF9C3", border: "#FACC15", text: "#A16207", gradient: "from-yellow-400 to-amber-500" },
  yellow: { bg: "#FFFBEB", border: "#F59E0B", text: "#B45309", gradient: "from-amber-400 to-orange-500" },
  orange: { bg: "#FFEDD5", border: "#F97316", text: "#C2410C", gradient: "from-orange-400 to-red-500" },
  "red-light": { bg: "#FEF2F2", border: "#F87171", text: "#B91C1C", gradient: "from-red-400 to-rose-500" },
  red: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B", gradient: "from-red-500 to-red-700" }
};

const getClassification = (valores, resultados) => {
  for (const [code, config] of Object.entries(classificationMatrix)) {
    if (valores >= config.valores.min && valores <= config.valores.max &&
        resultados >= config.resultados.min && resultados <= config.resultados.max) {
      return { code, ...config };
    }
  }
  return { code: "C1", ...classificationMatrix["C1"] };
};

// ============================================
// MOCK DATA
// ============================================

const mockDepartments = [
  { id: "dept-1", name: "Tecnología", color: "#3B82F6" },
  { id: "dept-2", name: "Operaciones", color: "#8B5CF6" },
  { id: "dept-3", name: "Ventas", color: "#10B981" },
  { id: "dept-4", name: "Soporte", color: "#F59E0B" },
  { id: "dept-5", name: "Administración", color: "#EC4899" },
];

const evaluatorTypes = [
  { id: "superior", name: "Superior", icon: UserCheck, color: "#3B82F6", weight: 30 },
  { id: "subordinados", name: "Subordinados", icon: Users, color: "#8B5CF6", weight: 20 },
  { id: "companeros", name: "Compañeros", icon: Users2, color: "#10B981", weight: 20 },
  { id: "clientes", name: "Clientes", icon: Briefcase, color: "#F59E0B", weight: 15 },
  { id: "autoevaluacion", name: "Autoevaluación", icon: User, color: "#EC4899", weight: 15 },
];

const competencias = [
  { id: "liderazgo", name: "Liderazgo", description: "Capacidad de guiar e inspirar a otros hacia los objetivos" },
  { id: "trabajo_equipo", name: "Trabajo en equipo", description: "Colaboración efectiva con compañeros" },
  { id: "resolucion_problemas", name: "Resolución de problemas", description: "Capacidad de analizar y resolver situaciones complejas" },
  { id: "aprendizaje_continuo", name: "Aprendizaje continuo", description: "Disposición para adquirir nuevos conocimientos" },
];

const valores = [
  { id: "hazlo_ahora", name: "Hazlo Ahora", description: "Actitud proactiva y de acción inmediata" },
  { id: "mejora_continua", name: "Mejora continua", description: "Dejar todo mejor de como lo encontraste" },
  { id: "autoaprendizaje", name: "Autoaprendizaje", description: "Iniciativa para aprender por cuenta propia" },
  { id: "alertidad", name: "Alertidad", description: "Estar atento a oportunidades y problemas" },
  { id: "amabilidad", name: "Amabilidad", description: "Trato cordial y respetuoso" },
  { id: "valor_agregado", name: "Valor Agregado", description: "Aportar más de lo esperado" },
  { id: "comunicacion_asertiva", name: "Comunicación Asertiva", description: "Expresar ideas de forma clara y respetuosa" },
];

const mockEmployees = [
  { 
    id: "EMP-001", name: "María García López", position: "Tech Lead", departmentId: "dept-1", department: "Tecnología",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    valoresScore: 92, resultadosScore: 88,
    autoEvalClassification: "A", // Lo que eligió en autoevaluación
    evaluations: { superior: 90, subordinados: 88, companeros: 85, clientes: 80, autoevaluacion: 95 },
    evaluatorCounts: { superior: 1, subordinados: 4, companeros: 6, clientes: 2 }, // Cuántos evaluaron
    evaluatorNames: { superior: ["Carlos Mendoza"], subordinados: ["Juan R.", "Laura S.", "Pedro M.", "Ana L."], companeros: ["Roberto D.", "Patricia L.", "Fernando T.", "Sofía G.", "Miguel A.", "Elena R."], clientes: ["Cliente Corp A", "Cliente Corp B"] },
    manualOverride: null
  },
  { 
    id: "EMP-002", name: "Juan Rodríguez", position: "Desarrollador Sr", departmentId: "dept-1", department: "Tecnología",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    valoresScore: 85, resultadosScore: 75,
    autoEvalClassification: "A",
    evaluations: { superior: 82, subordinados: 78, companeros: 80, clientes: 75, autoevaluacion: 88 },
    evaluatorCounts: { superior: 1, subordinados: 0, companeros: 5, clientes: 3 },
    evaluatorNames: { superior: ["María García"], subordinados: [], companeros: ["Laura S.", "Pedro M.", "Ana L.", "Roberto D.", "Patricia L."], clientes: ["TechCorp", "DataSoft", "CloudInc"] },
    manualOverride: null
  },
  { 
    id: "EMP-003", name: "Laura Sánchez", position: "Gerente de Operaciones", departmentId: "dept-2", department: "Operaciones",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    valoresScore: 95, resultadosScore: 55,
    autoEvalClassification: "B2",
    evaluations: { superior: 70, subordinados: 92, companeros: 88, clientes: 65, autoevaluacion: 90 },
    evaluatorCounts: { superior: 1, subordinados: 8, companeros: 4, clientes: 5 },
    evaluatorNames: { superior: ["Director Ops"], subordinados: ["Emp1", "Emp2", "Emp3", "Emp4", "Emp5", "Emp6", "Emp7", "Emp8"], companeros: ["Juan R.", "María G.", "Carlos M.", "Ana L."], clientes: ["Proveedor A", "Proveedor B", "Proveedor C", "Proveedor D", "Proveedor E"] },
    manualOverride: null
  },
  { 
    id: "EMP-004", name: "Carlos Mendoza", position: "Ejecutivo de Ventas", departmentId: "dept-3", department: "Ventas",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    valoresScore: 45, resultadosScore: 92,
    autoEvalClassification: "B4",
    evaluations: { superior: 85, subordinados: 40, companeros: 35, clientes: 90, autoevaluacion: 75 },
    evaluatorCounts: { superior: 1, subordinados: 2, companeros: 7, clientes: 12 },
    evaluatorNames: { superior: ["Director Ventas"], subordinados: ["Asistente 1", "Asistente 2"], companeros: ["V1", "V2", "V3", "V4", "V5", "V6", "V7"], clientes: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12"] },
    manualOverride: null
  },
  { 
    id: "EMP-005", name: "Ana Martínez", position: "Coordinadora de Soporte", departmentId: "dept-4", department: "Soporte",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    valoresScore: 72, resultadosScore: 78,
    autoEvalClassification: "B1",
    evaluations: { superior: 75, subordinados: 72, companeros: 78, clientes: 80, autoevaluacion: 70 },
    evaluatorCounts: { superior: 1, subordinados: 3, companeros: 4, clientes: 8 },
    evaluatorNames: { superior: ["Jefe Soporte"], subordinados: ["Técnico 1", "Técnico 2", "Técnico 3"], companeros: ["Comp1", "Comp2", "Comp3", "Comp4"], clientes: ["Usuario1", "Usuario2", "Usuario3", "Usuario4", "Usuario5", "Usuario6", "Usuario7", "Usuario8"] },
    manualOverride: null
  },
  { 
    id: "EMP-006", name: "Roberto Díaz", position: "Vendedor", departmentId: "dept-3", department: "Ventas",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    valoresScore: 78, resultadosScore: 85,
    autoEvalClassification: "A",
    evaluations: { superior: 88, subordinados: 70, companeros: 75, clientes: 85, autoevaluacion: 80 },
    evaluatorCounts: { superior: 1, subordinados: 0, companeros: 5, clientes: 15 },
    evaluatorNames: { superior: ["Carlos Mendoza"], subordinados: [], companeros: ["V1", "V2", "V3", "V4", "V5"], clientes: ["Cliente1", "Cliente2", "..."] },
    manualOverride: null
  },
  { 
    id: "EMP-007", name: "Patricia Luna", position: "Asistente Admin", departmentId: "dept-5", department: "Administración",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    valoresScore: 35, resultadosScore: 42,
    autoEvalClassification: "C4",
    evaluations: { superior: 40, subordinados: 35, companeros: 38, clientes: 45, autoevaluacion: 55 },
    evaluatorCounts: { superior: 1, subordinados: 0, companeros: 3, clientes: 2 },
    evaluatorNames: { superior: ["Director Admin"], subordinados: [], companeros: ["Comp1", "Comp2", "Comp3"], clientes: ["Proveedor1", "Proveedor2"] },
    manualOverride: null
  },
  { 
    id: "EMP-008", name: "Fernando Torres", position: "Técnico de Soporte", departmentId: "dept-4", department: "Soporte",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    valoresScore: 50, resultadosScore: 70,
    autoEvalClassification: "B1",
    evaluations: { superior: 65, subordinados: 55, companeros: 60, clientes: 72, autoevaluacion: 68 },
    evaluatorCounts: { superior: 1, subordinados: 0, companeros: 4, clientes: 20 },
    evaluatorNames: { superior: ["Ana Martínez"], subordinados: [], companeros: ["Comp1", "Comp2", "Comp3", "Comp4"], clientes: ["Muchos usuarios..."] },
    manualOverride: null
  }
];

// Mock evaluation templates
// Evaluator types for 360 evaluations
const evaluatorTypes360 = [
  { id: 'lider', name: 'Líder', icon: Shield, color: '#8B5CF6', description: 'Jefe, supervisor o manager' },
  { id: 'igual', name: 'Compañeros', icon: Users2, color: '#3B82F6', description: 'Pares o colegas del mismo nivel' },
  { id: 'subordinado', name: 'Subordinados', icon: User, color: '#10B981', description: 'Colaboradores a cargo' },
  { id: 'cliente', name: 'Cliente', icon: Briefcase, color: '#F59E0B', description: 'Clientes internos/externos' },
  { id: 'autoevaluacion', name: 'Autoevaluación', icon: UserCheck, color: '#EC4899', description: 'El mismo empleado' }
];

const mockEval360Templates = [
  {
    id: "eval-1",
    name: "Evaluación 360° Estándar",
    description: "Evaluación integral de competencias y valores. Se evalúa liderazgo, trabajo en equipo, comunicación y orientación a resultados.",
    generalDescription: "Esta evaluación mide las competencias clave para el éxito en la organización. Cada competencia se califica en una escala del 1 al 5, donde 1 es el nivel más bajo y 5 el más alto. Los resultados se promedian por tipo de evaluador para obtener una visión 360° completa.",
    isActive: true,
    assignedPositions: ["Todos"],
    competencies: [
      {
        id: "comp-1",
        title: "Trabajo en Equipo",
        behavior: "Colabora y participa activamente con los demás para alcanzar metas comunes",
        description: "Evalúa la capacidad del colaborador para trabajar efectivamente con otros y contribuir al logro de objetivos compartidos.",
        responses: [
          { value: 1, label: "Nunca colabora", description: "Nunca colabora ni apoya al equipo" },
          { value: 2, label: "Colabora poco", description: "Colabora poco y solo cuando se le pide" },
          { value: 3, label: "Colabora regularmente", description: "Colabora de forma regular según expectativas" },
          { value: 4, label: "Colabora frecuentemente", description: "Colabora frecuentemente y motiva a otros" },
          { value: 5, label: "Colabora siempre", description: "Siempre colabora y lidera iniciativas de equipo" }
        ]
      },
      {
        id: "comp-2",
        title: "Comunicación",
        behavior: "Se comunica de manera clara, efectiva y respetuosa",
        description: "Mide la habilidad para transmitir ideas y mantener comunicación constructiva.",
        responses: [
          { value: 1, label: "No se comunica", description: "No se comunica o lo hace de manera confusa" },
          { value: 2, label: "Comunica poco", description: "Se comunica poco y con dificultad" },
          { value: 3, label: "Comunica adecuadamente", description: "Se comunica adecuadamente la mayoría del tiempo" },
          { value: 4, label: "Comunica muy bien", description: "Se comunica muy bien, claro y escucha activamente" },
          { value: 5, label: "Comunicación excepcional", description: "Comunicación excepcional, facilita diálogos" }
        ]
      },
      {
        id: "comp-3",
        title: "Orientación a Resultados",
        behavior: "Cumple metas y busca mejorar su desempeño",
        description: "",
        responses: [
          { value: 1, label: "No cumple", description: "Raramente cumple metas establecidas" },
          { value: 2, label: "Cumple parcialmente", description: "Cumple parcialmente con las metas" },
          { value: 3, label: "Cumple metas", description: "Cumple con las metas establecidas" },
          { value: 4, label: "Supera metas", description: "Frecuentemente supera las metas" },
          { value: 5, label: "Siempre supera", description: "Siempre supera metas y busca excelencia" }
        ]
      },
      {
        id: "comp-4",
        title: "Liderazgo",
        behavior: "Inspira, guía y desarrolla a otros",
        description: "Evalúa capacidad para influir positivamente y empoderar al equipo.",
        responses: [
          { value: 1, label: "No lidera", description: "No demuestra capacidad de liderazgo" },
          { value: 2, label: "Lidera ocasionalmente", description: "Lidera ocasionalmente pero le falta confianza" },
          { value: 3, label: "Liderazgo adecuado", description: "Demuestra liderazgo cuando es necesario" },
          { value: 4, label: "Buen líder", description: "Buen líder, inspira y motiva al equipo" },
          { value: 5, label: "Líder excepcional", description: "Líder excepcional, desarrolla talento" }
        ]
      }
    ]
  },
  {
    id: "eval-2",
    name: "Evaluación Técnica",
    description: "Para posiciones técnicas. Evalúa conocimientos técnicos, resolución de problemas y aprendizaje.",
    generalDescription: "Evaluación enfocada en competencias técnicas. Se mide dominio de herramientas, capacidad de resolución de problemas y aprendizaje continuo.",
    isActive: true,
    assignedPositions: ["Desarrollador", "Tech Lead", "Técnico"],
    competencies: [
      {
        id: "comp-tech-1",
        title: "Conocimiento Técnico",
        behavior: "Domina las herramientas necesarias para su rol",
        description: "",
        responses: [
          { value: 1, label: "Básico", description: "Conocimiento muy básico" },
          { value: 2, label: "Limitado", description: "Conocimiento limitado, necesita supervisión" },
          { value: 3, label: "Adecuado", description: "Conocimiento adecuado para su nivel" },
          { value: 4, label: "Avanzado", description: "Conocimiento avanzado, resuelve problemas complejos" },
          { value: 5, label: "Experto", description: "Experto, es referente técnico" }
        ]
      },
      {
        id: "comp-tech-2",
        title: "Resolución de Problemas",
        behavior: "Analiza situaciones y propone soluciones efectivas",
        description: "",
        responses: [
          { value: 1, label: "No resuelve", description: "No resuelve problemas autónomamente" },
          { value: 2, label: "Simples", description: "Resuelve solo problemas simples" },
          { value: 3, label: "Adecuado", description: "Resuelve problemas de complejidad media" },
          { value: 4, label: "Muy bien", description: "Resuelve muy bien problemas complejos" },
          { value: 5, label: "Excepcional", description: "Resuelve excepcionalmente problemas complejos" }
        ]
      }
    ]
  }
];

const mockEvaluationPlans = [
  {
    id: "plan-1",
    employeeId: "1",
    employeeName: "María García López",
    templateId: "eval-1",
    templateName: "Evaluación 360° Estándar",
    period: "Q1 2024",
    createdDate: "2024-01-15",
    dueDate: "2024-03-31",
    evaluators: [
      { id: "ev-1", type: "lider", name: "Director Operaciones", email: "director@empresa.com", status: "completado", link: "eval/abc123", completedDate: "2024-02-10" },
      { id: "ev-2", type: "igual", name: "Juan Rodríguez", email: "juan@empresa.com", status: "completado", link: "eval/def456", completedDate: "2024-02-12" },
      { id: "ev-3", type: "igual", name: "Laura Sánchez", email: "laura@empresa.com", status: "enviado", link: "eval/ghi789", completedDate: null },
      { id: "ev-4", type: "subordinado", name: "Carlos Mendoza", email: "carlos@empresa.com", status: "completado", link: "eval/jkl012", completedDate: "2024-02-15" },
      { id: "ev-5", type: "subordinado", name: "Ana Martínez", email: "ana@empresa.com", status: "pendiente", link: "eval/mno345", completedDate: null },
      { id: "ev-6", type: "cliente", name: "Cliente Corp A", email: "cliente@corp.com", status: "completado", link: "eval/pqr678", completedDate: "2024-02-20" },
      { id: "ev-7", type: "autoevaluacion", name: "María García López", email: "maria@empresa.com", status: "completado", link: "eval/stu901", completedDate: "2024-02-08" }
    ]
  },
  {
    id: "plan-2",
    employeeId: "2",
    employeeName: "Juan Rodríguez",
    templateId: "eval-2",
    templateName: "Evaluación Técnica",
    period: "Q1 2024",
    createdDate: "2024-01-15",
    dueDate: "2024-03-31",
    evaluators: [
      { id: "ev-8", type: "lider", name: "Tech Lead Senior", email: "techlead@empresa.com", status: "completado", link: "eval/vwx234", completedDate: "2024-02-11" },
      { id: "ev-9", type: "igual", name: "María García López", email: "maria@empresa.com", status: "enviado", link: "eval/yza567", completedDate: null },
      { id: "ev-10", type: "subordinado", name: "Pedro García", email: "pedro@empresa.com", status: "pendiente", link: "eval/bcd890", completedDate: null },
      { id: "ev-11", type: "autoevaluacion", name: "Juan Rodríguez", email: "juan@empresa.com", status: "completado", link: "eval/efg123", completedDate: "2024-02-09" }
    ]
  }
];

const mockEvaluationResults = [
  {
    planId: "plan-1",
    employeeId: "1",
    employeeName: "María García López",
    results: {
      "comp-1": {
        responses: [
          { evaluatorId: "ev-1", type: "lider", score: 5 },
          { evaluatorId: "ev-2", type: "igual", score: 4 },
          { evaluatorId: "ev-4", type: "subordinado", score: 5 },
          { evaluatorId: "ev-6", type: "cliente", score: 4 },
          { evaluatorId: "ev-7", type: "autoevaluacion", score: 4 }
        ],
        average: 4.4,
        mostCommon: 4
      },
      "comp-2": {
        responses: [
          { evaluatorId: "ev-1", type: "lider", score: 5 },
          { evaluatorId: "ev-2", type: "igual", score: 5 },
          { evaluatorId: "ev-4", type: "subordinado", score: 4 },
          { evaluatorId: "ev-6", type: "cliente", score: 5 },
          { evaluatorId: "ev-7", type: "autoevaluacion", score: 4 }
        ],
        average: 4.6,
        mostCommon: 5
      },
      "comp-3": {
        responses: [
          { evaluatorId: "ev-1", type: "lider", score: 4 },
          { evaluatorId: "ev-2", type: "igual", score: 4 },
          { evaluatorId: "ev-4", type: "subordinado", score: 5 },
          { evaluatorId: "ev-6", type: "cliente", score: 4 },
          { evaluatorId: "ev-7", type: "autoevaluacion", score: 5 }
        ],
        average: 4.4,
        mostCommon: 4
      },
      "comp-4": {
        responses: [
          { evaluatorId: "ev-1", type: "lider", score: 5 },
          { evaluatorId: "ev-2", type: "igual", score: 4 },
          { evaluatorId: "ev-4", type: "subordinado", score: 5 },
          { evaluatorId: "ev-6", type: "cliente", score: 4 },
          { evaluatorId: "ev-7", type: "autoevaluacion", score: 4 }
        ],
        average: 4.4,
        mostCommon: 4
      }
    }
  },
  {
    planId: "plan-2",
    employeeId: "2",
    employeeName: "Juan Rodríguez",
    results: {
      "comp-tech-1": {
        responses: [
          { evaluatorId: "ev-8", type: "lider", score: 5 },
          { evaluatorId: "ev-11", type: "autoevaluacion", score: 4 }
        ],
        average: 4.5,
        mostCommon: 5
      },
      "comp-tech-2": {
        responses: [
          { evaluatorId: "ev-8", type: "lider", score: 4 },
          { evaluatorId: "ev-11", type: "autoevaluacion", score: 4 }
        ],
        average: 4.0,
        mostCommon: 4
      }
    }
  },
  {
    planId: "plan-3",
    employeeId: "3",
    employeeName: "Laura Sánchez",
    results: {
      "comp-1": {
        responses: [
          { type: "lider", score: 3 },
          { type: "igual", score: 4 },
          { type: "igual", score: 3 },
          { type: "subordinado", score: 4 },
          { type: "autoevaluacion", score: 4 }
        ],
        average: 3.6,
        mostCommon: 4
      },
      "comp-2": {
        responses: [
          { type: "lider", score: 3 },
          { type: "igual", score: 3 },
          { type: "igual", score: 3 },
          { type: "subordinado", score: 4 },
          { type: "autoevaluacion", score: 3 }
        ],
        average: 3.2,
        mostCommon: 3
      },
      "comp-3": {
        responses: [
          { type: "lider", score: 4 },
          { type: "igual", score: 4 },
          { type: "igual", score: 3 },
          { type: "subordinado", score: 4 },
          { type: "autoevaluacion", score: 4 }
        ],
        average: 3.8,
        mostCommon: 4
      },
      "comp-4": {
        responses: [
          { type: "lider", score: 3 },
          { type: "igual", score: 3 },
          { type: "igual", score: 2 },
          { type: "subordinado", score: 3 },
          { type: "autoevaluacion", score: 3 }
        ],
        average: 2.8,
        mostCommon: 3
      }
    }
  }
];

const mockPDIs = [
  {
    id: "pdi-1",
    employeeId: "1",
    employeeName: "María García López",
    department: "Tecnología",
    leader: "Director Operaciones",
    reviewer: "CEO",
    period: "Q1 2024",
    quarters: [
      {
        quarter: "Q1 2024",
        meta: "Mejorar habilidades de liderazgo técnico y mentoría del equipo junior",
        realidad: "Lidero equipo de 4 desarrolladores junior. Me falta experiencia en delegar tareas complejas y dar feedback regular.",
        aprendizajeFormal: "Curso online 'Leadership for Tech Managers' en Coursera (8 semanas)",
        aprendizajeSocial: "Mentoring mensual con CTO para casos de liderazgo",
        aprendizajeAplicado: "Implementar reuniones 1-1 semanales con equipo",
        voluntad: "3 horas semanales al curso, reuniones 1-1 sin falta, 2 técnicas nuevas de feedback/mes",
        evaluaciones: "Evaluación 360° trimestral + feedback equipo + retención"
      }
    ]
  },
  {
    id: "pdi-2",
    employeeId: "2",
    employeeName: "Juan Rodríguez",
    department: "Desarrollo",
    leader: "Tech Lead Senior",
    reviewer: "Director Tecnología",
    period: "Q1 2024",
    quarters: [
      {
        quarter: "Q1 2024",
        meta: "Profundizar conocimientos en arquitectura de software y patrones de diseño para liderar proyectos complejos",
        realidad: "Tengo buen dominio técnico pero me falta experiencia en diseño de arquitecturas escalables. A veces tomo decisiones técnicas sin considerar el impacto a largo plazo.",
        aprendizajeFormal: "Certificación en AWS Solutions Architect + Libro 'Design Patterns' de Gang of Four",
        aprendizajeSocial: "Participar en code reviews de proyectos complejos + Asistir a meetups de arquitectura",
        aprendizajeAplicado: "Liderar el rediseño de la arquitectura del módulo de pagos + Documentar decisiones arquitectónicas",
        voluntad: "Dedicar 5 horas semanales a estudio + Presentar propuesta de arquitectura cada mes + Mentoría con arquitecto senior quincenal",
        evaluaciones: "Evaluación técnica 360° + Revisión de código por pares + Éxito del proyecto de rediseño"
      }
    ]
  },
  {
    id: "pdi-3",
    employeeId: "3",
    employeeName: "Laura Sánchez",
    department: "Ventas",
    leader: "Gerente Comercial",
    reviewer: "Director Comercial",
    period: "Q1 2024",
    quarters: [
      {
        quarter: "Q1 2024",
        meta: "Mejorar habilidades de negociación y cierre de ventas complejas para aumentar conversión en 25%",
        realidad: "Tengo buena relación con clientes pero me cuesta cerrar ventas de alto valor. Necesito mejorar técnicas de manejo de objeciones y presentación de propuestas de valor.",
        aprendizajeFormal: "Curso 'Negociación Avanzada' en LinkedIn Learning + Taller presencial de técnicas de cierre",
        aprendizajeSocial: "Acompañar a top performer en 5 reuniones con clientes + Sesiones de role-play semanales con equipo",
        aprendizajeAplicado: "Aplicar framework SPIN en todas las reuniones de prospección + Crear plantilla de propuestas de valor",
        voluntad: "Practicar técnicas 30 min diarios + Aplicar al menos 2 técnicas nuevas por semana + Revisar grabaciones de llamadas semanalmente",
        evaluaciones: "Aumento en tasa de conversión + Valor promedio de deal + Feedback de clientes + Evaluación 360°"
      }
    ]
  }
];

// Mock Aciertos y Desaciertos
const mockAciertosDesaciertos = [
  {
    id: "ad-1",
    evaluatorId: "1",
    evaluatorName: "María García López",
    evaluatedId: "4",
    evaluatedName: "Carlos Mendoza",
    department: "Tecnología",
    date: "2024-03-15",
    month: 3,
    year: 2024,
    quarter: "Q1 2024",
    resultadoVsObjetivo: "Carlos ha mostrado un desempeño superior al esperado este trimestre. Logró completar el proyecto de migración de base de datos 2 semanas antes de lo planeado, con cero incidentes reportados. Sin embargo, identificamos áreas de mejora en la comunicación con stakeholders no técnicos.",
    aciertosColaborador: [
      "Excelente capacidad técnica y resolución de problemas complejos",
      "Proactividad en la identificación de bugs antes de producción",
      "Mentoría efectiva con desarrolladores junior del equipo",
      "Cumplimiento anticipado de deadlines en proyecto crítico"
    ],
    desaciertosColaborador: [
      "Falta de comunicación proactiva sobre bloqueos en tareas",
      "Documentación técnica incompleta en algunos módulos",
      "Poca participación en reuniones de planificación de equipo"
    ],
    aciertosEmpresa: [
      "Provisión de herramientas y recursos técnicos adecuados",
      "Flexibilidad en horarios para balance vida-trabajo",
      "Oportunidades de capacitación técnica continua"
    ],
    desaciertosEmpresa: [
      "Falta de claridad en requisitos al inicio del proyecto",
      "Cambios frecuentes de prioridades sin aviso previo",
      "Proceso de aprobación de PRs demasiado lento"
    ],
    compromisos: [
      { tipo: "colaborador", compromiso: "Enviar reportes semanales de progreso al equipo", fecha: "2024-04-01" },
      { tipo: "colaborador", compromiso: "Completar documentación técnica de módulos desarrollados", fecha: "2024-04-15" },
      { tipo: "colaborador", compromiso: "Asistir y participar activamente en dailies y plannings", fecha: "2024-04-01" },
      { tipo: "empresa", compromiso: "Definir requisitos completos antes de iniciar sprints", fecha: "2024-04-01" },
      { tipo: "empresa", compromiso: "Asignar revisor dedicado para PRs con SLA de 24hrs", fecha: "2024-04-10" }
    ]
  },
  {
    id: "ad-2",
    evaluatorId: "director",
    evaluatorName: "Director Comercial",
    evaluatedId: "3",
    evaluatedName: "Laura Sánchez",
    department: "Ventas",
    date: "2024-03-20",
    month: 3,
    year: 2024,
    quarter: "Q1 2024",
    resultadoVsObjetivo: "Laura alcanzó el 85% de su objetivo de ventas del trimestre. Aunque no llegó a la meta, mostró mejora consistente mes a mes. El pipeline está saludable para Q2.",
    aciertosColaborador: [
      "Excelente relación con clientes existentes (retención 95%)",
      "Mejora progresiva en técnicas de cierre",
      "Actitud positiva y disposición para aprender"
    ],
    desaciertosColaborador: [
      "Dificultad para cerrar ventas de alto valor",
      "Falta de seguimiento sistemático a prospectos",
      "Necesita mejorar presentación de propuestas de valor"
    ],
    aciertosEmpresa: [
      "Material de ventas de calidad",
      "Capacitación en producto completa"
    ],
    desaciertosEmpresa: [
      "Falta de herramientas de CRM actualizadas",
      "Proceso de aprobación de descuentos muy lento",
      "Poco apoyo de preventas en deals complejos"
    ],
    compromisos: [
      { tipo: "colaborador", compromiso: "Completar curso de negociación avanzada", fecha: "2024-05-01" },
      { tipo: "colaborador", compromiso: "Implementar seguimiento semanal a top 10 prospectos", fecha: "2024-04-01" },
      { tipo: "empresa", compromiso: "Implementar CRM Salesforce para el equipo", fecha: "2024-05-15" },
      { tipo: "empresa", compromiso: "Asignar ingeniero de preventas para deals >$50k", fecha: "2024-04-15" }
    ]
  },
  {
    id: "ad-3",
    evaluatorId: "techlead",
    evaluatorName: "Tech Lead Senior",
    evaluatedId: "2",
    evaluatedName: "Juan Rodríguez",
    department: "Desarrollo",
    date: "2024-02-28",
    month: 2,
    year: 2024,
    quarter: "Q1 2024",
    resultadoVsObjetivo: "Juan cumplió con todos los objetivos técnicos del mes. La calidad de su código es excelente y ha demostrado gran autonomía. Está listo para tomar más responsabilidades de liderazgo.",
    aciertosColaborador: [
      "Código limpio y bien documentado",
      "Resolución rápida de bugs críticos",
      "Ayuda proactiva a compañeros del equipo",
      "Ownership completo de sus proyectos"
    ],
    desaciertosColaborador: [
      "A veces sobre-engineerea soluciones simples",
      "Podría comunicar mejor sus decisiones técnicas"
    ],
    aciertosEmpresa: [
      "Stack tecnológico moderno y actualizado",
      "Buen ambiente de equipo y colaboración",
      "Proceso de code review efectivo"
    ],
    desaciertosEmpresa: [
      "Falta de documentación arquitectónica del sistema",
      "Reuniones demasiado frecuentes que interrumpen el flow"
    ],
    compromisos: [
      { tipo: "colaborador", compromiso: "Aplicar principio KISS en diseño de soluciones", fecha: "2024-03-15" },
      { tipo: "colaborador", compromiso: "Documentar decisiones técnicas en ADRs", fecha: "2024-03-01" },
      { tipo: "empresa", compromiso: "Crear documentación arquitectónica del sistema", fecha: "2024-04-01" },
      { tipo: "empresa", compromiso: "Reducir reuniones a 3 días por semana máximo", fecha: "2024-03-15" }
    ]
  },
  {
    id: "ad-4",
    evaluatorId: "1",
    evaluatorName: "María García López",
    evaluatedId: "5",
    evaluatedName: "Ana Martínez",
    department: "Tecnología",
    date: "2024-01-30",
    month: 1,
    year: 2024,
    quarter: "Q1 2024",
    resultadoVsObjetivo: "Ana está en su tercer mes en la empresa. Ha mostrado rápida curva de aprendizaje y buena integración al equipo. Cumplió con objetivos de onboarding.",
    aciertosColaborador: [
      "Rápida adaptación a tecnologías nuevas",
      "Hace muchas preguntas (señal de aprendizaje activo)",
      "Puntualidad y responsabilidad en entregas"
    ],
    desaciertosColaborador: [
      "Falta de confianza para tomar decisiones independientes",
      "Necesita más práctica en debugging",
      "A veces tarda mucho en pedir ayuda cuando está bloqueada"
    ],
    aciertosEmpresa: [
      "Programa de onboarding bien estructurado",
      "Asignación de mentor dedicado"
    ],
    desaciertosEmpresa: [
      "Documentación interna desactualizada",
      "Falta de tiempo del equipo para pair programming"
    ],
    compromisos: [
      { tipo: "colaborador", compromiso: "Aplicar regla de 30 minutos: pedir ayuda si está bloqueada >30min", fecha: "2024-02-01" },
      { tipo: "colaborador", compromiso: "Tomar ownership de al menos 1 feature pequeña por sprint", fecha: "2024-02-15" },
      { tipo: "empresa", compromiso: "Actualizar documentación de arquitectura y setup", fecha: "2024-02-28" },
      { tipo: "empresa", compromiso: "Agendar 2hrs/semana de pair programming con senior", fecha: "2024-02-01" }
    ]
  },
  {
    id: "ad-5",
    evaluatorId: "director",
    evaluatorName: "Director Operaciones",
    evaluatedId: "1",
    evaluatedName: "María García López",
    department: "Tecnología",
    date: "2024-03-10",
    month: 3,
    year: 2024,
    quarter: "Q1 2024",
    resultadoVsObjetivo: "María superó objetivos del trimestre. El equipo bajo su liderazgo entregó 3 proyectos mayores sin incidentes. La moral del equipo es alta y la rotación es cero.",
    aciertosColaborador: [
      "Liderazgo efectivo y empático con el equipo",
      "Excelente planificación y gestión de proyectos",
      "Desarrollo de talento junior en el equipo",
      "Comunicación clara con stakeholders"
    ],
    desaciertosColaborador: [
      "Tiende a involucrarse demasiado en tareas operativas",
      "Podría delegar más para enfocarse en estrategia",
      "Necesita mejorar balance vida-trabajo (muchas horas extra)"
    ],
    aciertosEmpresa: [
      "Autonomía y confianza en decisiones técnicas",
      "Budget adecuado para herramientas y capacitación"
    ],
    desaciertosEmpresa: [
      "Falta de visibilidad de roadmap de producto a largo plazo",
      "Expectativas de disponibilidad 24/7 no sostenibles"
    ],
    compromisos: [
      { tipo: "colaborador", compromiso: "Delegar tareas operativas y enfocarse en estrategia", fecha: "2024-04-01" },
      { tipo: "colaborador", compromiso: "Establecer límites claros de horario laboral", fecha: "2024-04-01" },
      { tipo: "empresa", compromiso: "Compartir roadmap de producto trimestral con tech leads", fecha: "2024-04-15" },
      { tipo: "empresa", compromiso: "Definir política de on-call rotativo (no solo María)", fecha: "2024-04-10" }
    ]
  },
  {
    id: "ad-6",
    evaluatorId: "gerente",
    evaluatorName: "Gerente RRHH",
    evaluatedId: "6",
    evaluatedName: "Roberto Fernández",
    department: "Operaciones",
    date: "2024-02-15",
    month: 2,
    year: 2024,
    quarter: "Q1 2024",
    resultadoVsObjetivo: "Roberto alcanzó el 92% de sus KPIs operativos. Mejoró significativamente la eficiencia de procesos logísticos. Hay oportunidad de crecimiento en gestión de equipo.",
    aciertosColaborador: [
      "Optimización de procesos que redujo costos 15%",
      "Datos y análisis siempre actualizados",
      "Iniciativa para proponer mejoras"
    ],
    desaciertosColaborador: [
      "Dificultad para dar feedback constructivo al equipo",
      "Falta de seguimiento a tareas delegadas",
      "Necesita desarrollar habilidades de gestión de conflictos"
    ],
    aciertosEmpresa: [
      "Inversión en software de gestión operativa",
      "Apoyo en implementación de mejoras propuestas"
    ],
    desaciertosEmpresa: [
      "Falta de capacitación en liderazgo",
      "Poco tiempo asignado para desarrollo profesional"
    ],
    compromisos: [
      { tipo: "colaborador", compromiso: "Asistir a taller de liderazgo y gestión de equipos", fecha: "2024-03-30" },
      { tipo: "colaborador", compromiso: "Implementar reuniones 1-1 semanales con cada miembro", fecha: "2024-03-01" },
      { tipo: "empresa", compromiso: "Proveer acceso a programa de mentoring de liderazgo", fecha: "2024-03-15" },
      { tipo: "empresa", compromiso: "Asignar 4hrs/semana para desarrollo profesional", fecha: "2024-03-01" }
    ]
  },
  {
    id: "ad-7",
    evaluatorId: "director",
    evaluatorName: "Director Comercial",
    evaluatedId: "7",
    evaluatedName: "Patricia Ruiz",
    department: "Ventas",
    date: "2024-01-25",
    month: 1,
    year: 2024,
    quarter: "Q1 2024",
    resultadoVsObjetivo: "Patricia está teniendo dificultades para alcanzar objetivos (60% de meta). Identificamos gap de habilidades que requiere plan de acción urgente.",
    aciertosColaborador: [
      "Actitud positiva ante feedback",
      "Esfuerzo y dedicación evidentes",
      "Buena gestión de pipeline en CRM"
    ],
    desaciertosColaborador: [
      "Falta de técnicas de cierre efectivas",
      "Dificultad para manejar objeciones complejas",
      "Necesita mejorar conocimiento profundo de producto",
      "Falta de seguimiento post-reunión con prospectos"
    ],
    aciertosEmpresa: [
      "Soporte del equipo y manager disponible"
    ],
    desaciertosEmpresa: [
      "Onboarding comercial insuficiente",
      "Falta de capacitación en producto antes de empezar",
      "No hay programa de shadowing con vendedores senior"
    ],
    compromisos: [
      { tipo: "colaborador", compromiso: "Completar certificación de producto (nivel avanzado)", fecha: "2024-02-28" },
      { tipo: "colaborador", compromiso: "Practicar manejo de objeciones con manager 2x/semana", fecha: "2024-02-01" },
      { tipo: "colaborador", compromiso: "Acompañar a top performer en 10 reuniones de ventas", fecha: "2024-03-01" },
      { tipo: "empresa", compromiso: "Rediseñar programa de onboarding comercial", fecha: "2024-03-31" },
      { tipo: "empresa", compromiso: "Asignar mentor senior dedicado a Patricia", fecha: "2024-02-01" },
      { tipo: "empresa", compromiso: "Ajustar meta temporalmente (75%) durante período de mejora", fecha: "2024-02-01" }
    ]
  }
];


// Mock KPI templates
const mockKPITemplates = [
  {
    id: "kpi-template-1",
    name: "KPIs Comerciales",
    description: "Para el área de ventas",
    assignedDepartments: ["Ventas"],
    kpis: [
      { id: "ventas", name: "Ventas mensuales", weight: 40, unit: "$", target: 100000, thresholds: { red: 60, yellow: 80, green: 100 } },
      { id: "clientes", name: "Clientes nuevos", weight: 30, unit: "clientes", target: 10, thresholds: { red: 50, yellow: 70, green: 90 } },
      { id: "retencion", name: "Retención", weight: 30, unit: "%", target: 95, thresholds: { red: 70, yellow: 85, green: 95 } },
    ]
  },
  {
    id: "kpi-template-2",
    name: "KPIs Soporte",
    description: "Para el área de soporte técnico",
    assignedDepartments: ["Soporte"],
    kpis: [
      { id: "tickets", name: "Tickets resueltos", weight: 40, unit: "tickets", target: 100, thresholds: { red: 50, yellow: 75, green: 90 } },
      { id: "tiempo", name: "Tiempo promedio resolución", weight: 35, unit: "hrs", target: 4, thresholds: { red: 60, yellow: 80, green: 95 } },
      { id: "satisfaccion", name: "Satisfacción cliente", weight: 25, unit: "%", target: 90, thresholds: { red: 60, yellow: 80, green: 90 } },
    ]
  }
];

// Auto-adjust weights
const autoAdjustWeights = (items, changedId, newWeight, totalTarget = 100) => {
  const otherItems = items.filter(i => i.id !== changedId);
  const remainingWeight = Math.max(0, totalTarget - newWeight);
  const currentOtherTotal = otherItems.reduce((sum, i) => sum + i.weight, 0);
  
  if (currentOtherTotal === 0 || otherItems.length === 0) {
    return items.map(i => i.id === changedId ? { ...i, weight: newWeight } : i);
  }
  
  const ratio = remainingWeight / currentOtherTotal;
  return items.map(i => {
    if (i.id === changedId) return { ...i, weight: newWeight };
    return { ...i, weight: Math.round(i.weight * ratio) };
  });
};

// ============================================
// SIDEBAR
// ============================================

const Sidebar = ({ isAdmin, setIsAdmin }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const allNavItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", description: "Vista general", roles: ['admin', 'empleado'] },
    { path: `/perfil/${user?.employee_id || '1'}`, icon: User, label: "Mi Perfil", description: "Información personal", roles: ['admin', 'empleado'] },
    { path: "/9box", icon: Grid3X3, label: "Empleado A", description: "Empleados A, B, C", roles: ['admin', 'empleado'] },
    { path: "/employees", icon: Users, label: "Empleados", description: "Gestión de personal", roles: ['admin'] },
    { path: "/evaluations", icon: MessageSquare, label: "Evaluaciones 360", description: "Plantillas y enlaces", roles: ['admin', 'empleado'] },
    { path: "/pdi", icon: Target, label: "PDI", description: "Plan de Desarrollo", roles: ['admin'] },
    { path: "/aciertos-desaciertos", icon: ClipboardList, label: "Aciertos y Desaciertos", description: "Evaluación bilateral", roles: ['admin'] },
    { path: "/kpis", icon: Target, label: "KPIs", description: "Indicadores clave", roles: ['admin'] },
    // PROCESS MODULE
    { path: "/process/my", icon: PlayCircle, label: "Mis Procesos", description: "Procesos disponibles", roles: ['admin', 'empleado', 'manager'] },
    { path: "/process/my-assigned-steps", icon: UserCheck, label: "Pasos asignados a mí", description: "Colaboración entre áreas", roles: ['admin', 'empleado', 'manager'] },
    { path: "/process/my-executions", icon: ClipboardList, label: "Mis Ejecuciones", description: "Historial personal", roles: ['admin', 'empleado', 'manager'] },
    { path: "/process/all", icon: FolderOpen, label: "Todos los Procesos", description: "Explorar por área", roles: ['admin', 'empleado', 'manager'], dropdown: 'process-tree' },
    { path: "/process/admin/processes", icon: Workflow, label: "Procesos", description: "Definir procesos", roles: ['admin'] },
    { path: "/process/admin/executions", icon: Activity, label: "Ejecuciones", description: "Monitoreo global", roles: ['admin'] },
    { path: "/process/schedule", icon: CalendarClock, label: "Programación", description: "Calendario y tabla", roles: ['admin', 'empleado', 'manager'] },
    { path: "/process/admin/dashboard", icon: BarChart2, label: "Dashboard Process", description: "Estadísticas", roles: ['admin'] },
    { path: "/process/admin/types", icon: Sliders, label: "Tipos de Proceso", description: "Categorías y colores", roles: ['admin'] },
    { path: "/process/admin/consequences", icon: AlertTriangle, label: "Consecuencias", description: "Niveles de omisión", roles: ['admin'] },
    { path: "/audits", icon: ClipboardCheck, label: "Auditorías", description: "Evaluar procesos", roles: ['admin'] },
  ];
  
  // Filtrar navItems basado en el rol del usuario
  const navItems = allNavItems.filter(item => item.roles.includes(user?.role || 'empleado'));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>EvalPro</h1>
            <p className="text-xs text-slate-500">Sistema 360°</p>
          </div>
        </div>
        
        {/* User info */}
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-900 mb-0.5">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <div className="mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
              user?.role === 'manager' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              {user?.role === 'admin' ? 'Admin' : user?.role === 'manager' ? 'Manager' : 'Empleado'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              {item.dropdown === 'process-tree' ? (
                <ProcessTreeDropdown />
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-600 hover:text-slate-900"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <div className="flex-1">
                    <span className="block">{item.label}</span>
                    <span className="text-xs text-slate-400">{item.description}</span>
                  </div>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-3">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

// ============================================
// 9-BOX GRID WITH PERCENTAGES INSIDE CELLS
// ============================================

const MyProfileResultsView = ({ isAdmin }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(mockEmployees[0]);
  const location = useLocation();
  
  // If coming from another view with a selected employee
  useState(() => {
    if (location.state?.employee) {
      setSelectedEmployee(location.state.employee);
    }
  }, [location]);

  const classification = getClassification(selectedEmployee.valoresScore, selectedEmployee.resultadosScore);
  const colors = classificationColors[classification.color];
  const autoClassification = classificationMatrix[selectedEmployee.autoEvalClassification];
  const autoColors = classificationColors[autoClassification?.color || 'yellow'];

  const radarData = competencias.map(c => ({ 
    subject: c.name, 
    score: Math.round(60 + Math.random() * 35), 
    fullMark: 100 
  }));

  const valoresRadarData = valores.slice(0, 5).map(v => ({ 
    subject: v.name.substring(0, 12), 
    score: Math.round(60 + Math.random() * 35), 
    fullMark: 100 
  }));

  const totalEvaluators = Object.values(selectedEmployee.evaluatorCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Perfil y Resultados
          </h1>
          <p className="text-slate-500 mt-1">Vista detallada de evaluación</p>
        </div>
        
        {isAdmin && (
          <select
            value={selectedEmployee?.id || ''}
            onChange={(e) => setSelectedEmployee(mockEmployees.find(emp => emp.id === e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          >
            {mockEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Employee Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <img src={selectedEmployee.avatar} alt="" className="w-24 h-24 rounded-2xl object-cover" />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-slate-900">{selectedEmployee.name}</h2>
            <p className="text-slate-500">{selectedEmployee.position} · {selectedEmployee.department}</p>
            
            {/* Evaluator count */}
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4" />
              <span>Evaluado por <strong>{totalEvaluators} personas</strong></span>
            </div>
          </div>
          
          {/* Classification comparison */}
          <div className="flex gap-4">
            {/* Calculated */}
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-2">Resultado Calculado</p>
              <div 
                className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center"
                style={{ backgroundColor: colors.bg, border: `3px solid ${colors.border}` }}
              >
                <span className="text-3xl font-bold" style={{ color: colors.text }}>{classification.code}</span>
                <span className="text-xs font-medium" style={{ color: colors.text }}>{classification.label}</span>
              </div>
            </div>
            
            {/* Auto-evaluation */}
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-2">Autoevaluación</p>
              <div 
                className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed"
                style={{ backgroundColor: autoColors.bg, borderColor: autoColors.border }}
              >
                <span className="text-3xl font-bold" style={{ color: autoColors.text }}>{selectedEmployee.autoEvalClassification}</span>
                <span className="text-xs font-medium" style={{ color: autoColors.text }}>{autoClassification?.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Difference indicator */}
        {classification.code !== selectedEmployee.autoEvalClassification && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              <strong>Diferencia detectada:</strong> El empleado se autoevaluó como <strong>{selectedEmployee.autoEvalClassification}</strong> pero el resultado calculado es <strong>{classification.code}</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Scores and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Scores breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Puntuaciones</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-600">Valores</span>
                <span className="font-bold text-purple-600">{selectedEmployee.valoresScore}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${selectedEmployee.valoresScore}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-600">Resultados</span>
                <span className="font-bold text-blue-600">{selectedEmployee.resultadosScore}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedEmployee.resultadosScore}%` }} />
              </div>
            </div>
          </div>

          {/* Evaluator breakdown */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
              {isAdmin ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Por Evaluador
            </p>
            {evaluatorTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <type.icon className="w-4 h-4" style={{ color: type.color }} />
                  {type.name}
                </span>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">{selectedEmployee.evaluations[type.id]}%</span>
                  {type.id !== 'autoevaluacion' && (
                    <p className="text-xs text-slate-400">
                      {isAdmin ? (
                        <span title={selectedEmployee.evaluatorNames[type.id]?.join(', ')}>
                          {selectedEmployee.evaluatorNames[type.id]?.length || 0} personas
                        </span>
                      ) : (
                        `${selectedEmployee.evaluatorCounts[type.id]} personas`
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competencias Radar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Competencias</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Valores Radar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Valores</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={valoresRadarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar dataKey="score" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action recommendation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Plan de Acción Recomendado</h3>
        <div className="p-4 rounded-xl" style={{ backgroundColor: colors.bg }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.border }}>
              <span className="text-white font-bold">{classification.code}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{classification.label}</p>
              <p className="text-sm text-slate-600 mt-1">{classification.description}</p>
              <p className="text-sm font-medium mt-2" style={{ color: colors.text }}>
                → {classification.action}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// EVALUATIONS VIEW - WITH CREATE TEMPLATE
// ============================================

// ============================================
// EVALUATIONS 360 MODULE - REDESIGNED
// ============================================

// ============================================
// REMAINING COMPONENTS (Employees, Manual Eval, Public Form)
// Dashboard ahora está en /pages/Dashboard.jsx
// ============================================

const EmployeeList = ({ isAdmin }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const filteredEmployees = mockEmployees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Empleados</h1>
          <p className="text-slate-500 mt-1">Gestión del personal</p>
        </div>
        <button className="bg-slate-900 text-white rounded-xl px-4 py-2.5 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Empleado</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-4">Valores</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-4">Resultados</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-4">Clasificación</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-4">Evaluadores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.map((emp) => {
              const classification = getClassification(emp.valoresScore, emp.resultadosScore);
              const colors = classificationColors[classification.color];
              const totalEvaluators = Object.values(emp.evaluatorCounts).reduce((a, b) => a + b, 0);
              
              // Extraer ID del empleado (EMP-001 -> 1)
              const employeeId = emp.id.replace('EMP-00', '');
              
              return (
                <tr 
                  key={emp.id} 
                  onClick={() => navigate(`/perfil/${employeeId}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-slate-900">{emp.name}</p>
                        <p className="text-sm text-slate-500">{emp.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-purple-600">{emp.valoresScore}%</td>
                  <td className="px-6 py-4 text-center font-semibold text-blue-600">{emp.resultadosScore}%</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-lg font-bold text-sm" style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {classification.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-600">{totalEvaluators} personas</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManualEvaluation = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Evaluación Manual</h1>
        <p className="text-slate-500 mt-1">Asigna directamente un cuadrante del 9-Box</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <p className="text-sm text-amber-700"><AlertTriangle className="w-4 h-4 inline mr-2" />Esta clasificación sobrescribirá el resultado calculado.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-4">1. Seleccionar Empleado</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mockEmployees.map((emp) => {
              const classification = getClassification(emp.valoresScore, emp.resultadosScore);
              const colors = classificationColors[classification.color];
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left ${selectedEmployee?.id === emp.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}
                >
                  <img src={emp.avatar} alt="" className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{emp.name}</p>
                    <p className="text-sm text-slate-500">{emp.position}</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg font-bold text-sm" style={{ backgroundColor: colors.bg, color: colors.text }}>{classification.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-4">2. Seleccionar Clasificación</h2>
          {selectedEmployee ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {["B3", "B2", "A", "C4", "B1", "B4", "C1", "C2", "C3"].map((code) => {
                  const config = classificationMatrix[code];
                  const colors = classificationColors[config.color];
                  return (
                    <button
                      key={code}
                      onClick={() => setSelectedCode(code)}
                      className={`rounded-xl border-2 p-3 text-center ${selectedCode === code ? 'ring-2 ring-slate-900' : ''}`}
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <span className="text-xl font-bold" style={{ color: colors.text }}>{code}</span>
                      <p className="text-xs mt-1" style={{ color: colors.text }}>{config.label}</p>
                    </button>
                  );
                })}
              </div>
              {selectedCode && (
                <>
                  <textarea rows={3} placeholder="Justificación..." className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4" />
                  <button className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 font-medium">Aplicar Override</button>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecciona un empleado primero</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

const Layout = ({ children, isAdmin, setIsAdmin }) => (
  <div className="flex min-h-screen bg-[#FAFAFA]">
    <Sidebar isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
    <main className="flex-1 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">{children}</div>
    </main>
  </div>
);

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <Routes>
      <Route path="/evaluate/:token" element={<PublicEvaluationForm />} />
      <Route path="*" element={
        <Layout isAdmin={isAdmin} setIsAdmin={() => {}}>
          <Routes>
            <Route path="/" element={<Dashboard isAdmin={isAdmin} />} />
            <Route path="/9box" element={<EmpleadoAPage isAdmin={isAdmin} />} />
            <Route path="/employees" element={<EmployeeList isAdmin={isAdmin} />} />
            <Route path="/evaluations" element={<Evaluations360View isAdmin={isAdmin} />} />
            <Route path="/pdi" element={<PDIView isAdmin={isAdmin} />} />
            <Route path="/aciertos-desaciertos" element={<AciertosDesaciertosView isAdmin={isAdmin} />} />
            <Route path="/kpis" element={<KPIsView isAdmin={isAdmin} />} />
            <Route path="/my-profile" element={<MyProfileResultsView isAdmin={isAdmin} />} />
            <Route path="/manual-eval" element={<ManualEvaluation />} />
            <Route path="/perfil/:employeeId" element={<EmployeeProfile />} />
            {/* PROCESS MODULE */}
            <Route path="/process" element={<ProcessHome />} />
            <Route path="/process/my" element={<MyProcesses />} />
            <Route path="/process/my-assigned-steps" element={<MyAssignedSteps />} />
            <Route path="/process/my-executions" element={<MyExecutions />} />
            <Route path="/process/schedule" element={<ProcessSchedule />} />
            <Route path="/audits" element={<AuditList />} />
            <Route path="/audits/new" element={<AuditForm />} />
            <Route path="/audits/:id" element={<AuditDetail />} />
            <Route path="/audits/:id/plan-correctivo" element={<AuditCorrectivePlanPage />} />
            <Route path="/process/execution/:id" element={<ExecutionDetail />} />
            <Route path="/process/admin/processes" element={<ProcessList />} />
            <Route path="/process/admin/processes/new" element={<ProcessForm />} />
            <Route path="/process/admin/processes/:id" element={<ProcessDetail />} />
            <Route path="/process/admin/processes/:id/info" element={<ProcessInfo />} />
            <Route path="/process/admin/processes/:id/edit" element={<ProcessForm />} />
            <Route path="/process/admin/types" element={<ProcessTypes />} />
            <Route path="/process/admin/consequences" element={<ConsequenceSystems />} />
            <Route path="/process/admin/dashboard" element={<ProcessDashboard />} />
            <Route path="/process/admin/executions" element={<AdminExecutions />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

const AciertosDesaciertosView = ({ isAdmin }) => {
  const [viewMode, setViewMode] = useState('cards');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('2024');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  // Fetch evaluations and employees from API
  useEffect(() => {
    fetchData();
  }, [filterMonth, filterYear, filterDepartment, filterEmployee]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evaluationsData, employeesData] = await Promise.all([
        aciertosAPI.getAll({
          month: filterMonth,
          year: filterYear,
          department: filterDepartment,
          employee_id: filterEmployee
        }),
        employeesAPI.getAll()
      ]);
      setEvaluations(evaluationsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvaluation = async (evalData) => {
    try {
      await aciertosAPI.create(evalData);
      fetchData();
      setShowForm(false);
    } catch (error) {
      console.error('Error creating evaluation:', error);
      alert('Error al crear evaluación');
    }
  };

  const handleUpdateEvaluation = async (id, evalData) => {
    try {
      await aciertosAPI.update(id, evalData);
      fetchData();
      setShowForm(false);
    } catch (error) {
      console.error('Error updating evaluation:', error);
      alert('Error al actualizar evaluación');
    }
  };

  const filteredEvaluations = evaluations;

  const groupedByMonth = filteredEvaluations.reduce((acc, ev) => {
    const key = `${ev.year}-${String(ev.month).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const months = [
    { value: 'all', label: 'Todos los meses' },
    { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
  ];

  const departments = employees.length > 0 
    ? ['all', ...new Set(employees.map(e => e.department || e.area).filter(Boolean))]
    : ['all'];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Aciertos y Desaciertos
          </h1>
          <p className="text-slate-500 mt-1">Retroalimentación de la empresa: Qué debe seguir haciendo y qué debe dejar de hacer</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSelectedEvaluation(null); }}
          className="bg-slate-900 text-white rounded-xl px-4 py-2.5 font-medium hover:bg-slate-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Evaluación
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Filtros</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Mes</label>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
              {months.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Año</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <option value="all">Todos</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Área</label>
            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <option value="all">Todas</option>
              {departments.filter(d => d !== 'all').map(dept => (<option key={dept} value={dept}>{dept}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Colaborador</label>
            <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <option value="all">Todos</option>
              {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
          <span className="font-medium">{filteredEvaluations.length} evaluaciones encontradas</span>
          {(filterMonth !== 'all' || filterYear !== 'all' || filterDepartment !== 'all' || filterEmployee !== 'all') && (
            <button onClick={() => { setFilterMonth('all'); setFilterYear('2024'); setFilterDepartment('all'); setFilterEmployee('all'); }} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <X className="w-3 h-3" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {viewMode === 'cards' && (
        <div className="space-y-6">
          {Object.keys(groupedByMonth).sort().reverse().map(monthKey => {
            const [year, month] = monthKey.split('-');
            const monthName = months.find(m => m.value === String(parseInt(month)))?.label;
            const evaluations = groupedByMonth[monthKey];
            return (
              <div key={monthKey}>
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {monthName} {year} ({evaluations.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {evaluations.map(ev => (
                    <div key={ev.id} onClick={() => { setSelectedEvaluation(ev); setShowDetail(true); }} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-900 hover:ring-2 hover:ring-slate-900/10 cursor-pointer transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">{ev.department}</p>
                          <h4 className="font-semibold text-slate-900 mb-1">{ev.evaluatedName}</h4>
                          <p className="text-xs text-slate-500">Evaluado por: {ev.evaluatorName}</p>
                        </div>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{new Date(ev.date).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-xs text-green-700 font-medium mb-1">Aciertos</p>
                          <p className="text-lg font-bold text-green-900">{ev.aciertosColaborador.length + ev.aciertosEmpresa.length}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2">
                          <p className="text-xs text-red-700 font-medium mb-1">Desaciertos</p>
                          <p className="text-lg font-bold text-red-900">{ev.desaciertosColaborador.length + ev.desaciertosEmpresa.length}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{ev.compromisos.length} compromisos generados</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filteredEvaluations.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron evaluaciones</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Fecha</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Colaborador</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Evaluador</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Área</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Aciertos</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Desaciertos</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Compromisos</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.map(ev => (
                <tr key={ev.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-600">{new Date(ev.date).toLocaleDateString('es-ES')}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{ev.evaluatedName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{ev.evaluatorName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{ev.department}</td>
                  <td className="px-6 py-4"><span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">{ev.aciertosColaborador.length + ev.aciertosEmpresa.length}</span></td>
                  <td className="px-6 py-4"><span className="text-sm font-semibold text-red-700 bg-red-50 px-2 py-1 rounded">{ev.desaciertosColaborador.length + ev.desaciertosEmpresa.length}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-600">{ev.compromisos.length}</td>
                  <td className="px-6 py-4"><button onClick={() => { setSelectedEvaluation(ev); setShowDetail(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver detalle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEvaluations.length === 0 && (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron evaluaciones</p>
            </div>
          )}
        </div>
      )}

      {showForm && <AciertosDesaciertosForm onClose={() => { setShowForm(false); setSelectedEvaluation(null); }} evaluation={selectedEvaluation} employees={employees} onSubmit={selectedEvaluation ? handleUpdateEvaluation : handleCreateEvaluation} />}
      {showDetail && <AciertosDesaciertosDetail evaluation={selectedEvaluation} onClose={() => setShowDetail(false)} onEdit={() => { setShowDetail(false); setShowForm(true); }} />}
    </div>
  );
};

const AciertosDesaciertosForm = ({ onClose, evaluation, employees, onSubmit }) => {
  const isEditing = !!evaluation;

  const [formData, setFormData] = useState(evaluation || {
    evaluatorId: '', evaluatedId: '', date: new Date().toISOString().split('T')[0],
    resultadoVsObjetivo: '', aciertosColaborador: [''], desaciertosColaborador: [''],
    aciertosEmpresa: [''], desaciertosEmpresa: [''], compromisos: [{ tipo: 'colaborador', compromiso: '', fecha: '' }]
  });

  const addItem = (field) => setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  const removeItem = (field, index) => setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  const updateItem = (field, index, value) => setFormData(prev => ({ ...prev, [field]: prev[field].map((item, i) => i === index ? value : item) }));
  const addCompromiso = () => setFormData(prev => ({ ...prev, compromisos: [...prev.compromisos, { tipo: 'colaborador', compromiso: '', fecha: '' }] }));
  const removeCompromiso = (index) => setFormData(prev => ({ ...prev, compromisos: prev.compromisos.filter((_, i) => i !== index) }));
  const updateCompromiso = (index, field, value) => setFormData(prev => ({ ...prev, compromisos: prev.compromisos.map((comp, i) => i === index ? { ...comp, [field]: value } : comp) }));
  
  const handleSubmit = async () => {
    if (!formData.evaluatedId) {
      alert('Debes seleccionar a quién se evalúa');
      return;
    }
    
    try {
      if (isEditing) {
        await onSubmit(evaluation.id, formData);
      } else {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-slate-200 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Editar Evaluación' : 'Nueva Evaluación de Aciertos y Desaciertos'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quién evalúa</label>
              <select value={formData.evaluatorId} onChange={(e) => setFormData(prev => ({ ...prev, evaluatorId: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="">Seleccionar...</option>
                {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">A quién se evalúa *</label>
              <select value={formData.evaluatedId} onChange={(e) => setFormData(prev => ({ ...prev, evaluatedId: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="">Seleccionar...</option>
                {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Resultado Actual vs Objetivo Trimestre</h3>
            <textarea rows={4} value={formData.resultadoVsObjetivo} onChange={(e) => setFormData(prev => ({ ...prev, resultadoVsObjetivo: e.target.value }))} placeholder="Describe el desempeño actual vs objetivos del trimestre..." className="w-full border border-slate-200 rounded-xl px-4 py-3 resize-none" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Escucha y genera compromisos</h3>
            
            {/* Guía para colaborador */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium mb-1">
                💡 Guía para Colaborador
              </p>
              <p className="text-sm text-blue-700">
                ¿Qué ha salido bien? ¿Qué salió mal y se puede mejorar?
              </p>
            </div>
            
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Aciertos y Desaciertos - Colaborador</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-700">✓ Aciertos (Qué debe seguir haciendo)</p>
                  <button onClick={() => addItem('aciertosColaborador')} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"><PlusCircle className="w-3 h-3" />Agregar</button>
                </div>
                <div className="space-y-2">
                  {formData.aciertosColaborador.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={item} onChange={(e) => updateItem('aciertosColaborador', idx, e.target.value)} placeholder="Acierto del colaborador..." className="flex-1 border border-green-200 bg-green-50/30 rounded-lg px-3 py-2 text-sm" />
                      {formData.aciertosColaborador.length > 1 && (<button onClick={() => removeItem('aciertosColaborador', idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-red-700">✗ Desaciertos (Qué debe dejar de hacer)</p>
                  <button onClick={() => addItem('desaciertosColaborador')} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"><PlusCircle className="w-3 h-3" />Agregar</button>
                </div>
                <div className="space-y-2">
                  {formData.desaciertosColaborador.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={item} onChange={(e) => updateItem('desaciertosColaborador', idx, e.target.value)} placeholder="Desacierto del colaborador..." className="flex-1 border border-red-200 bg-red-50/30 rounded-lg px-3 py-2 text-sm" />
                      {formData.desaciertosColaborador.length > 1 && (<button onClick={() => removeItem('desaciertosColaborador', idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Comentario explicativo para la empresa */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium">
                💡 Explicar con cuidado al colaborador qué debe seguir haciendo y qué debe dejar de hacer. Esto es retroalimentación de la empresa.
              </p>
            </div>
            
            <h4 className="text-sm font-semibold text-slate-700 mb-1">Retroalimentación para el Colaborador</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-700">✓ Aciertos</p>
                  <button onClick={() => addItem('aciertosEmpresa')} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"><PlusCircle className="w-3 h-3" />Agregar</button>
                </div>
                <div className="space-y-2">
                  {formData.aciertosEmpresa.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={item} onChange={(e) => updateItem('aciertosEmpresa', idx, e.target.value)} placeholder="Acierto de la empresa..." className="flex-1 border border-green-200 bg-green-50/30 rounded-lg px-3 py-2 text-sm" />
                      {formData.aciertosEmpresa.length > 1 && (<button onClick={() => removeItem('aciertosEmpresa', idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-red-700">✗ Desaciertos</p>
                  <button onClick={() => addItem('desaciertosEmpresa')} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"><PlusCircle className="w-3 h-3" />Agregar</button>
                </div>
                <div className="space-y-2">
                  {formData.desaciertosEmpresa.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={item} onChange={(e) => updateItem('desaciertosEmpresa', idx, e.target.value)} placeholder="Desacierto de la empresa..." className="flex-1 border border-red-200 bg-red-50/30 rounded-lg px-3 py-2 text-sm" />
                      {formData.desaciertosEmpresa.length > 1 && (<button onClick={() => removeItem('desaciertosEmpresa', idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900">Compromisos Generados</h3>
              <button onClick={addCompromiso} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><PlusCircle className="w-4 h-4" />Agregar compromiso</button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Tipo</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Compromiso</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Fecha</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.compromisos.map((comp, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <select value={comp.tipo} onChange={(e) => updateCompromiso(idx, 'tipo', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm">
                          <option value="colaborador">Colaborador</option>
                          <option value="empresa">Empresa</option>
                        </select>
                      </td>
                      <td className="px-4 py-3"><input type="text" value={comp.compromiso} onChange={(e) => updateCompromiso(idx, 'compromiso', e.target.value)} placeholder="Descripción del compromiso..." className="w-full border border-slate-200 rounded-lg px-3 py-1 text-sm" /></td>
                      <td className="px-4 py-3"><input type="date" value={comp.fecha} onChange={(e) => updateCompromiso(idx, 'fecha', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm" /></td>
                      <td className="px-4 py-3">{formData.compromisos.length > 1 && (<button onClick={() => removeCompromiso(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-medium hover:bg-slate-800">{isEditing ? 'Actualizar' : 'Guardar'} Evaluación</button>
        </div>
      </div>
    </div>
  );
};

const AciertosDesaciertosDetail = ({ evaluation, onClose, onEdit }) => {
  if (!evaluation) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-slate-200 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-slate-900">Detalle de Evaluación</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-xs text-slate-500 mb-1">Evaluado</p>
              <p className="font-semibold text-slate-900">{evaluation.evaluatedName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Evaluador</p>
              <p className="font-semibold text-slate-900">{evaluation.evaluatorName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Fecha</p>
              <p className="font-semibold text-slate-900">{new Date(evaluation.date).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          {/* Resultado vs Objetivo */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Resultado vs Objetivo del Trimestre</h3>
            <p className="text-slate-700 bg-blue-50 p-4 rounded-lg">{evaluation.resultadoVsObjetivo}</p>
          </div>

          {/* Aciertos y Desaciertos - Colaborador */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Colaborador</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" />
                  Aciertos ({evaluation.aciertosColaborador?.length || 0})
                </p>
                <ul className="space-y-1">
                  {evaluation.aciertosColaborador?.map((item, idx) => (
                    <li key={idx} className="text-sm text-green-900">• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4" />
                  Desaciertos ({evaluation.desaciertosColaborador?.length || 0})
                </p>
                <ul className="space-y-1">
                  {evaluation.desaciertosColaborador?.map((item, idx) => (
                    <li key={idx} className="text-sm text-red-900">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Aciertos y Desaciertos - Empresa */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" />
                  Aciertos ({evaluation.aciertosEmpresa?.length || 0})
                </p>
                <ul className="space-y-1">
                  {evaluation.aciertosEmpresa?.map((item, idx) => (
                    <li key={idx} className="text-sm text-green-900">• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4" />
                  Desaciertos ({evaluation.desaciertosEmpresa?.length || 0})
                </p>
                <ul className="space-y-1">
                  {evaluation.desaciertosEmpresa?.map((item, idx) => (
                    <li key={idx} className="text-sm text-red-900">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Compromisos */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Compromisos Generados ({evaluation.compromisos?.length || 0})</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Tipo</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Compromiso</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.compromisos?.map((comp, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          comp.tipo === 'colaborador' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {comp.tipo === 'colaborador' ? 'Colaborador' : 'Empresa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{comp.compromiso}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{comp.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50">
            Cerrar
          </button>
          <button onClick={onEdit} className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-medium hover:bg-slate-800">
            Editar
          </button>
        </div>
      </div>
    </div>
  );
};


// Placeholder para PublicEvaluationForm (evaluación pública vía link)
const PublicEvaluationForm = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Formulario Público de Evaluación</h1>
        <p className="text-slate-600">Esta funcionalidad estará disponible próximamente.</p>
      </div>
    </div>
  );
};


export default App;
