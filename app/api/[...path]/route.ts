import { handleApi } from "@/lib/server";
export const dynamic="force-dynamic";
type Context={params:Promise<{path:string[]}>};
export async function GET(request:Request,{params}:Context){return handleApi(request,(await params).path);}
export async function POST(request:Request,{params}:Context){return handleApi(request,(await params).path);}
export async function DELETE(request:Request,{params}:Context){return handleApi(request,(await params).path);}
