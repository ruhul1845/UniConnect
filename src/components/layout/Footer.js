import { Link } from 'react-router-dom';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto border-t-4 border-yellow-400 bg-[#18004d] px-6 py-10 text-white">
            <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
                <div>
                    <h3 className="text-2xl font-black text-yellow-400">UniConnect</h3>
                    <p className="mt-3 text-sm leading-6 text-blue-100">
                        A verified digital hub for academic resources, marketplace, housing,
                        chat and student safety support.
                    </p>
                </div>

                <div>
                    <h4 className="font-black">Routes</h4>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-blue-100">
                        <Link className="hover:text-yellow-300" to="/resources">Resources</Link>
                        <Link className="hover:text-yellow-300" to="/marketplace">Marketplace</Link>
                        <Link className="hover:text-yellow-300" to="/housing">Housing & To-Let</Link>
                        <Link className="hover:text-yellow-300" to="/safety">Safety</Link>
                        <Link className="hover:text-yellow-300" to="/conversations">Chat</Link>
                    </div>
                </div>

                <div>
                    <h4 className="font-black">Contact</h4>
                    <p className="mt-3 text-sm leading-6 text-blue-100">
                        CSE Department, University Campus
                        <br />
                        support@uniconnect.edu
                    </p>
                </div>
            </div>

            <div className="mx-auto mt-10 max-w-7xl border-t border-white/15 pt-5 text-center text-sm text-blue-100">
                <p>
                    © {currentYear} <span className="font-bold text-yellow-400">UniConnect</span>. All rights reserved.
                </p>
            </div>
        </footer>
    );
}