import { Navbar } from '@/components/navbar'
import { SearchBar } from '@/components/search-bar'

/** Navbar shell with the full-width search bar for content pages. */
export function SearchNavbar() {
	return (
		<Navbar
			center={
				<SearchBar
					className="w-full md:mx-auto md:max-w-md"
					fullWidthDropdown
				/>
			}
		/>
	)
}
