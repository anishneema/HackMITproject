import { Contact } from './types'

export class CSVReader {
  static async parseCSV(csvContent: string): Promise<Contact[]> {
    const lines = csvContent.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = this.parseCSVLine(lines[0])
    const contacts: Contact[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i])
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row ${i + 1}: expected ${headers.length} columns, got ${values.length}`)
        continue
      }

      const contact = this.parseContactFromRow(headers, values)
      if (contact && this.validateEmail(contact.email)) {
        contacts.push(contact)
      } else {
        console.warn(`Skipping row ${i + 1}: invalid or missing email`)
      }
    }

    return contacts
  }

  static async parseCSVFile(file: File): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const csvContent = event.target?.result as string
          const contacts = await this.parseCSV(csvContent)
          resolve(contacts)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i += 2
        } else {
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }

    result.push(current.trim())
    return result
  }

  private static parseContactFromRow(headers: string[], values: string[]): Contact | null {
    const contact: Contact = { email: '' }
    const customFields: Record<string, string> = {}

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim()
      const value = values[i]?.trim() || ''

      switch (header) {
        case 'email':
        case 'email address':
        case 'emailaddress':
        case 'e-mail':
          contact.email = value
          break
        case 'firstname':
        case 'first name':
        case 'first_name':
          contact.firstName = value
          break
        case 'lastname':
        case 'last name':
        case 'last_name':
          contact.lastName = value
          break
        case 'name':
        case 'full name':
        case 'fullname':
        case 'contact name':
          // Split full name into first and last name
          if (value) {
            const nameParts = value.split(' ')
            contact.firstName = nameParts[0] || ''
            contact.lastName = nameParts.slice(1).join(' ') || ''
          }
          break
        case 'organization':
        case 'company':
        case 'org':
          contact.organization = value
          break
        case 'phone':
        case 'phone number':
        case 'mobile':
        case 'cell':
          customFields['phone'] = value
          break
        case 'location':
        case 'city':
        case 'address':
          customFields['location'] = value
          break
        default:
          if (value) {
            customFields[header] = value
          }
      }
    }

    if (!contact.email) {
      console.warn('Skipping contact: no email address found')
      return null
    }

    // Ensure we have at least some name information
    if (!contact.firstName && !contact.lastName) {
      console.warn(`Contact ${contact.email} has no name information`)
      // You could still include them if you want, or skip them
      // For now, we'll include them but mark as unknown
      contact.firstName = 'Unknown'
    }

    if (Object.keys(customFields).length > 0) {
      contact.customFields = customFields
    }

    return contact
  }

  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

export const csvReader = new CSVReader()