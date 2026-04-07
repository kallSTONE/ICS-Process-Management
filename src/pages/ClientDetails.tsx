import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";

export default function ClientDetails() {
    const { id } = useParams();
    const { user, role } = useAuth();

    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [govIdUrl, setGovIdUrl] = useState<string | null>(null);
    const [birthCertUrl, setBirthCertUrl] = useState<string | null>(null);

    const [applicationNumber, setApplicationNumber] = useState<string>("");
    const [epNumber, setEpNumber] = useState<string>("");
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!id || !user || !role) return;
        loadClient();
    }, [id, user, role]);

    const loadClient = async () => {
        setLoading(true);
        try {
            // Admins should be able to fetch any client directly (no join).
            if (role === "admin") {
                const res = await supabase
                    .from("clients")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();

                console.log("loadClient (admin) result:", res);
                if (res.error) throw res.error;
                setClient(res.data ?? null);
                return;
            }

            // Employees: only fetch if they are assigned to the client.
            if (role === "employee") {
                const res = await supabase
                    .from("clients")
                    .select(`*, employee_clients!inner(user_id)`)
                    .eq("id", id)
                    .eq("employee_clients.user_id", user?.id)
                    .maybeSingle();

                console.log("loadClient (employee) result:", res);
                if (res.error) throw res.error;
                setClient(res.data ?? null);
                return;
            }

            // Fallback: try to fetch client row directly (for other roles)
            const res = await supabase
                .from("clients")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            console.log("loadClient (fallback) result:", res);
            if (res.error) throw res.error;
            setClient(res.data ?? null);
        } catch (err) {
            console.error("Error loading client details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!client) return;

        setApplicationNumber(client.application_number ?? "");
        setEpNumber(client.ep_number ?? "");

        if (client.gov_id_url) generateSignedUrl(client.gov_id_url, setGovIdUrl);
        if (client.birth_certificate_url)
            generateSignedUrl(client.birth_certificate_url, setBirthCertUrl);
    }, [client]);

    const generateSignedUrl = async (path: string, setter: (v: string | null) => void) => {
        try {
            const { data, error } = await supabase.storage
                .from("client-documents")
                .createSignedUrl(path, 600, { download: true });

            if (error) {
                console.error("Signed URL error:", error);
                setter(null);
                return;
            }

            setter(data.signedUrl);
        } catch (err) {
            console.error("Signed URL generation failed:", err);
        }
    };

    const handleEmployeeSubmit = async () => {
        if (!client || !id) return;
        setSubmitting(true);
        try {
            let screenshotUrl = null;
            if (screenshotFile) {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("client-documents")
                    .upload(`screenshots/${id}_${Date.now()}`, screenshotFile);

                if (uploadError) throw uploadError;
                screenshotUrl = uploadData?.path;
            }

            const updates: any = {
                application_number: applicationNumber,
                ep_number: epNumber || null,
                employee_screenshot_url: screenshotUrl,
                status: "in_progress",
            };

            const res = await supabase
                .from("clients")
                .update(updates)
                .eq("id", id);

            console.log("handleEmployeeSubmit result:", res);

            if (res.error) {
                console.error("Supabase update error:", res.error);
                toast.error(res.error.message || "Update failed");
                return;
            }

            // Refresh client row (separate select to avoid PostgREST content-negotiation issues)
            await loadClient();
            toast.success("Employee details submitted, status set to In Progress");
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmIcsPayment = async () => {
        if (!client) return;
        setSubmitting(true);
        try {
            const res = await supabase
                .from("clients")
                .update({ status: "ics_payment_confirmed" })
                .eq("id", client.id);

            console.log("handleConfirmIcsPayment result:", res);

            if (res.error) {
                console.error("Supabase confirm error:", res.error);
                toast.error(res.error.message || "Confirm failed");
                return;
            }

            await loadClient();
            toast.success("ICS payment confirmed");
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Failed to confirm ICS payment");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div>
                <p className="text-muted-foreground">Client not found or not assigned to you.</p>
                <Button asChild>
                    <Link to="/clients">Back to clients</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{client.full_name}</h1>
                    <p className="text-muted-foreground mt-1">Client details</p>
                </div>
                <Button asChild>
                    <Link to="/clients">Back</Link>
                </Button>
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-6 p-6 border rounded-lg bg-card shadow-sm">
                <Info label="Full name" value={client.full_name} />
                <Info label="Phone" value={client.phone} />
                <Info label="Email" value={client.email ?? "—"} />
                <Info label="Application type" value={(client.application_type || "").replace("_", " ")} />
                <Info label="Status" value={<StatusBadge status={client.status as any} />} />
                <Info label="Created" value={new Date(client.created_at).toLocaleString()} />
            </div>

            {/* Employee submission */}
            {role === "employee" && client.status === "initial_payment_confirmed" && (
                <div className="p-6 border rounded-lg bg-card shadow-sm">
                    <h2 className="text-lg font-semibold mb-3">Employee Actions</h2>
                    <input
                        className="p-2 border rounded w-full mb-2"
                        placeholder="Application Number (alphanumeric)"
                        value={applicationNumber}
                        onChange={(e) => setApplicationNumber(e.target.value)}
                    />
                    <input
                        className="p-2 border rounded w-full mb-2"
                        placeholder="EP Number (alphanumeric)"
                        value={epNumber}
                        onChange={(e) => setEpNumber(e.target.value)}
                    />
                    <input
                        type="file"
                        className="mb-2"
                        onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                        onClick={handleEmployeeSubmit}
                        disabled={submitting || !/^[A-Za-z0-9-]+$/.test(applicationNumber) || !/^[A-Za-z0-9-]+$/.test(epNumber)}
                    >
                        {submitting ? "Submitting..." : "Submit EP and Application"}
                    </Button>
                </div>
            )}

            {/* Admin/Payer ICS confirmation */}
            {(role === "admin" || role === "payer") && (client.status === "in_progress" || client.status === "ics_payment_pending") && (
                <div className="p-6 border rounded-lg bg-card shadow-sm">
                    <h2 className="text-lg font-semibold mb-3">ICS Payment</h2>
                    <Info label="Application Number" value={client.application_number} />
                    <Info label="EP Number" value={client.ep_number} />
                    {client.employee_screenshot_url && (
                        <a href={supabase.storage.from("client-documents").getPublicUrl(client.employee_screenshot_url).data.publicUrl} target="_blank" rel="noreferrer">
                            View Screenshot
                        </a>
                    )}
                    <div className="mt-2">
                        <Button onClick={handleConfirmIcsPayment} disabled={submitting}>
                            {submitting ? "Confirming..." : "Confirm ICS Payment"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Documents Section */}
            <h2 className="text-xl font-semibold">Client Documents</h2>
            <div className="grid grid-cols-2 gap-6">
                <DocCard title="Government ID" imageUrl={govIdUrl} fileName={client.gov_id_url} />
                <DocCard title="Birth Certificate" imageUrl={birthCertUrl} fileName={client.birth_certificate_url} />
            </div>
        </div>
    );
}

/* Reusable Components */
function Info({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <h3 className="text-sm text-muted-foreground">{label}</h3>
            <div className="font-medium">{value}</div>
        </div>
    );
}

function DocCard({ title, imageUrl, fileName }: { title: string; imageUrl: string | null; fileName: string | null }) {
    return (
        <div className="p-6 border rounded-lg bg-card shadow-sm">
            <h3 className="text-sm text-muted-foreground mb-2">{title}</h3>
            {!fileName && <div className="font-medium">—</div>}
            {fileName && (
                <>
                    {imageUrl ? (
                        <>
                            <img src={imageUrl} alt={title} className="w-full h-64 object-cover rounded border shadow-sm mb-3" />
                            <Button asChild variant="outline" className="w-full">
                                <a href={imageUrl} download>
                                    Download {title}
                                </a>
                            </Button>
                        </>
                    ) : (
                        <div className="font-medium text-red-600">Failed to load document</div>
                    )}
                </>
            )}
        </div>
    );
}
