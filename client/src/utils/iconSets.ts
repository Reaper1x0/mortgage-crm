// ---- Icon sets to include ----
import * as FaIcons from "react-icons/fa";   // Font Awesome
import * as MdIcons from "react-icons/md";   // Material Design
import * as BiIcons from "react-icons/bi";   // BoxIcons
import * as AiIcons from "react-icons/ai";   // Ant Design
import * as BsIcons from "react-icons/bs";   // Bootstrap
import * as CiIcons from "react-icons/ci";   // Circum Icons
import * as FiIcons from "react-icons/fi";   // Feather Icons
import * as GiIcons from "react-icons/gi";   // Game Icons
import * as GoIcons from "react-icons/go";   // GitHub Octicons
import * as GrIcons from "react-icons/gr";   // Grommet Icons
import * as HiIcons from "react-icons/hi";   // Heroicons
import * as ImIcons from "react-icons/im";   // IcoMoon
import * as IoIcons from "react-icons/io";   // Ionicons 4
import * as Io5Icons from "react-icons/io5"; // Ionicons 5
import * as LuIcons from "react-icons/lu";   // Lucide Icons
import * as PiIcons from "react-icons/pi";   // Phosphor Icons
import * as RiIcons from "react-icons/ri";   // Remix Icons
import * as SiIcons from "react-icons/si";   // Simple Icons (brands)
import * as SlIcons from "react-icons/sl";   // Simple Line Icons
import * as TbIcons from "react-icons/tb";   // Tabler Icons
import * as TfiIcons from "react-icons/tfi"; // Themify Icons
import * as VscIcons from "react-icons/vsc"; // VS Code Icons
import * as CgIcons from "react-icons/cg";   // CSS.gg Icons
import { IconType } from "react-icons";

// ---- Types ----
export type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

export type IconLibrary = {
  prefix: string;
  name: string;
  icons: Record<string, IconComponent>;
};


export const ICON_LIBRARIES: IconLibrary[] = [
  { prefix: "fa", name: "Font Awesome", icons: FaIcons },
  { prefix: "md", name: "Material Design", icons: MdIcons },
  { prefix: "bi", name: "Box Icons", icons: BiIcons },
  { prefix: "ai", name: "Ant Design", icons: AiIcons },
  { prefix: "bs", name: "Bootstrap", icons: BsIcons },
  { prefix: "ci", name: "Circum", icons: CiIcons },
  { prefix: "fi", name: "Feather", icons: FiIcons },
  { prefix: "gi", name: "Game", icons: GiIcons },
  { prefix: "go", name: "GitHub Octicons", icons: GoIcons },
  { prefix: "gr", name: "Grommet", icons: GrIcons },
  { prefix: "hi", name: "Heroicons", icons: HiIcons },
  { prefix: "im", name: "IcoMoon", icons: ImIcons },
  { prefix: "io", name: "Ionicons 4", icons: IoIcons },
  { prefix: "io5", name: "Ionicons 5", icons: Io5Icons },
  { prefix: "lu", name: "Lucide", icons: LuIcons },
  { prefix: "pi", name: "Phosphor", icons: PiIcons },
  { prefix: "ri", name: "Remix", icons: RiIcons },
  { prefix: "si", name: "Simple", icons: SiIcons },
  { prefix: "sl", name: "Simple Line", icons: SlIcons },
  { prefix: "tb", name: "Tabler", icons: TbIcons },
  { prefix: "tfi", name: "Themify", icons: TfiIcons },
  { prefix: "vsc", name: "VS Code", icons: VscIcons },
  { prefix: "cg", name: "CSS.gg", icons: CgIcons },
];


export const ICON_SETS: Record<string, Record<string, IconType>> = {
  fa: FaIcons,
  md: MdIcons,
  bi: BiIcons,
  ai: AiIcons,
  bs: BsIcons,
  ci: CiIcons,
  fi: FiIcons,
  gi: GiIcons,
  go: GoIcons,
  gr: GrIcons,
  hi: HiIcons,
  im: ImIcons,
  io: IoIcons,
  io5: Io5Icons,
  lu: LuIcons,
  pi: PiIcons,
  ri: RiIcons,
  si: SiIcons,
  sl: SlIcons,
  tb: TbIcons,
  tfi: TfiIcons,
  vsc: VscIcons,
  cg: CgIcons,
} as const;