import { Button } from '../components/ui/Button';
import { Card, Badge } from '../components/ui/Card';
import { Field, inputClass, selectClass } from '../components/ui/Form';
import PageHero from '../components/ui/PageHero';

const houses = [
    [
        'Azimpur Shared Room',
        '৳6,500/mo',
        'Roommate',
        'Available',
        'Near campus, suitable for CSE students.',
    ],
    [
        'Dhanmondi Sublet',
        '৳12,000/mo',
        'Sublet',
        'Available',
        'Quiet study environment and easy transport.',
    ],
    [
        'Nilkhet Flat Seat',
        '৳8,500/mo',
        'Flat',
        'Occupied Soon',
        'Affordable seat with CSE-only preference.',
    ],
];

function HousingCard({ h }) {
    const [title, price, type, status, desc] = h;

    return (
        <Card className="p-6">
            <div className="flex gap-2">
                <Badge>{type}</Badge>
                <Badge tone="blue">{status}</Badge>
            </div>

            <h3 className="mt-4 text-xl font-black text-uniBlue">
                {title}
            </h3>

            <p className="mt-2 text-slate-600">
                {desc}
            </p>

            <p className="mt-4 text-2xl font-black text-emerald-600">
                {price}
            </p>

            <div className="mt-6 flex gap-3">
                <Button variant="navy">View Details</Button>
                <Button variant="outline">Chat</Button>
            </div>
        </Card>
    );
}

export default function HousingPage() {
    return (
        <>
            <PageHero
                eyebrow="Accommodation Finder"
                title="Housing & To-Let Finder"
                subtitle="Find flats, sublets and compatible roommates near campus with CSE-only visibility and availability filters."
                actions={<Button>Post Housing Listing</Button>}
            />

            <main className="mx-auto max-w-7xl px-6 py-10">
                <Card className="mb-8 p-5">
                    <div className="grid gap-4 md:grid-cols-4">
                        <Field label="Location">
                            <input
                                className={inputClass}
                                placeholder="Azimpur, Dhanmondi, Nilkhet"
                            />
                        </Field>

                        <Field label="Max Rent">
                            <input
                                className={inputClass}
                                placeholder="৳ 10000"
                            />
                        </Field>

                        <Field label="Type">
                            <select className={selectClass}>
                                <option>All Types</option>
                                <option>Flat</option>
                                <option>Sublet</option>
                                <option>Roommate</option>
                            </select>
                        </Field>

                        <Field label="Visibility">
                            <select className={selectClass}>
                                <option>CSE Only</option>
                                <option>All Verified Students</option>
                            </select>
                        </Field>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        {['Available Now', 'Roommate Match', 'Map View', 'Near Campus'].map(
                            (item, index) => (
                                <button
                                    type="button"
                                    className={`rounded-full px-5 py-2.5 text-sm font-black ${index === 0
                                            ? 'bg-uniGold text-uniBlue'
                                            : 'bg-blue-50 text-uniBlue'
                                        }`}
                                    key={item}
                                >
                                    {item}
                                </button>
                            )
                        )}
                    </div>
                </Card>

                <div className="grid gap-6 lg:grid-cols-[1fr_430px]">
                    <section className="grid gap-6">
                        {houses.map((h) => (
                            <HousingCard key={h[0]} h={h} />
                        ))}
                    </section>

                    <aside className="min-h-[520px] rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-xl">
                        <Badge>Map Preview</Badge>

                        <div className="relative mt-5 h-[440px] rounded-3xl bg-gradient-to-br from-blue-100 to-yellow-50">
                            <span className="absolute left-1/4 top-1/3 h-5 w-5 rounded-full bg-red-500 ring-8 ring-red-200" />
                            <span className="absolute right-1/3 top-1/2 h-5 w-5 rounded-full bg-red-500 ring-8 ring-red-200" />
                            <span className="absolute bottom-1/4 left-1/2 h-5 w-5 rounded-full bg-red-500 ring-8 ring-red-200" />
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
}