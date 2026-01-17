
import { XMLParser } from 'fast-xml-parser'

export interface RSSItem {
    title: string
    link: string
    description: string
    pubDate: string
    guid?: string
}

export async function fetchRSS(url: string): Promise<RSSItem[]> {
    try {
        const response = await fetch(url)
        const xml = await response.text()

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        })

        const result = parser.parse(xml)
        const channel = result.rss?.channel || result.feed
        const items = channel.item || channel.entry || []

        return Array.isArray(items) ? items.map((item: any) => ({
            title: item.title,
            link: item.link,
            description: item.description || item.summary,
            pubDate: item.pubDate || item.updated,
            guid: item.guid
        })) : []

    } catch (error) {
        console.error(`Error fetching RSS from ${url}:`, error)
        return []
    }
}
