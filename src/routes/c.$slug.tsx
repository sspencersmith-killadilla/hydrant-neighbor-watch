import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/blockaid/SiteHeader";
import { CityProvider, useCity } from "@/lib/session";
import { cityBySlugQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/c/$slug")({
  head: () => ({
    meta: [
      { title: "City Map — BlockAid" },
      { name: "description", content: "A BlockAid city: adopt storm drains, hydrants and sidewalks and report problems to Public Works." },
      { property: "og:title", content: "City Map — BlockAid" },
      { property: "og:description", content: "Help your neighborhood get ready for severe weather." },
    ],
  }),
  component: CityLayout,
});

function CityLayout() {
  const { slug } = Route.useParams();
  const { data: city, isLoading } = useQuery(cityBySlugQuery(slug));
  if (isLoading) return <><SiteHeader /><main className="flex-1 animate-pulse bg-muted" /></>;
  if (!city)
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md flex-1 p-6 text-center">
          <h1 className="text-2xl font-bold">City not found</h1>
          <p className="mt-2 text-muted-foreground">No BlockAid city uses the address “{slug}”.</p>
          <Button asChild size="tap" className="mt-4"><Link to="/">See all cities</Link></Button>
        </main>
      </>
    );
  return (
    <CityProvider city={city}>
      <CityHeader />
      <Outlet />
    </CityProvider>
  );
}

function CityHeader() {
  const { city, isAdmin } = useCity();
  return <SiteHeader city={city} isAdmin={isAdmin} />;
}
