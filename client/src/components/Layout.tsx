import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { Link } from 'wouter'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow dark:bg-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-semibold"><Link href="/">Marathon Pace</Link></h1>
          <Menu as="div" className="relative">
            <Menu.Button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md p-1 z-10">
                <Menu.Item>{({ active }) => <Link href="/" className={`block px-4 py-2 rounded-md ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>Home</Link>}</Menu.Item>
                <Menu.Item>{({ active }) => <Link href="/fit-upload" className={`block px-4 py-2 rounded-md ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>FIT Upload</Link>}</Menu.Item>
                <Menu.Item>{({ active }) => <Link href="/saved-plan" className={`block px-4 py-2 rounded-md ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>Saved Plans</Link>}</Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}