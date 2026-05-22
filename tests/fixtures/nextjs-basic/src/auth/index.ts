import { session } from "./session";
import { guard } from "@/lib/guards";

export const auth = [session, guard];
