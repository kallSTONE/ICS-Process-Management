import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

export default function ClientDetails() {
    const { id } = useParams();

    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [govIdUrl, setGovIdUrl] = useState<string | null>(null);
    const [birthCertUrl, setBirthCertUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        loadClient();
    }, [id]);

    const loadClient = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            if (error) throw error;

            setClient(data ?? null);
        } catch (err) {
            console.error("Error loading client details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!client) return;

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
                <p className="text-muted-foreground">Client not found</p>
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

            {/* Client Basic Info */}
            <div className="grid grid-cols-2 gap-6 p-6 border rounded-lg bg-white shadow-sm">
                <Info label="Full name" value={client.full_name} />
                <Info label="Phone" value={client.phone} />
                <Info label="Email" value={client.email ?? "—"} />
                <Info
                    label="Application type"
                    value={(client.application_type || "").replace("_", " ")}
                />
                <Info label="Status" value={<StatusBadge status={client.status as any} />} />
                <Info
                    label="Created"
                    value={new Date(client.created_at).toLocaleString()}
                />
            </div>

            {/* Documents Section */}
            <h2 className="text-xl font-semibold">Client Documents</h2>

            <div className="grid grid-cols-2 gap-6">
                <DocCard
                    title="Government ID"
                    imageUrl={govIdUrl}
                    fileName={client.gov_id_url}
                />
                <DocCard
                    title="Birth Certificate"
                    imageUrl={birthCertUrl}
                    fileName={client.birth_certificate_url}
                />
            </div>
        </div>
    );
}

/* ---------------------------- Reusable Components ---------------------------- */

function Info({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <h3 className="text-sm text-muted-foreground">{label}</h3>
            <div className="font-medium">{value}</div>
        </div>
    );
}

function DocCard({
    title,
    imageUrl,
    fileName,
}: {
    title: string;
    imageUrl: string | null;
    fileName: string | null;
}) {
    return (
        <div className="p-6 border rounded-lg bg-white shadow-sm">
            <h3 className="text-sm text-muted-foreground mb-2">{title}</h3>

            {!fileName && (
                <div className="font-medium">—</div>
            )}

            {fileName && (
                <>
                    {imageUrl ? (
                        <>
                            <img
                                src={imageUrl}
                                alt={title}
                                className="w-full h-64 object-cover rounded border shadow-sm mb-3"
                            />

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
